import { Inject, Injectable } from '@nestjs/common';
import { Lead, SenlerGroup } from '@prisma/client';
import { AxiosError } from 'axios';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { SenlerApiClientV2 } from 'senler-sdk';
import { AmoCrmService } from 'src/external/amo-crm';
import { AmoCrmExceptionType, GetLeadResponse as AmoCrmLead, AmoCrmTokens } from 'src/external/amo-crm/amo-crm.dto';
import { SenlerService } from 'src/external/senler/senler.service';
import { AppConfigType } from 'src/infrastructure/config/config.app-config';
import { CONFIG } from 'src/infrastructure/config/config.module';
import { PRISMA } from 'src/infrastructure/database/database.config';
import { PrismaExtendedClientType } from 'src/infrastructure/database/database.service';
import { RabbitMqService } from 'src/infrastructure/rabbitmq/rabbitmq.service';
import { RedisService } from 'src/infrastructure/redis/redis.service';
import { convertExceptionToString, timeToMilliseconds } from 'src/utils';
import { Logger } from 'winston';
import { LOGGER_INJECTABLE_NAME } from './integration.config';
import { BotStepType, BotStepWebhookDto, GetSenlerGroupFieldsDto, TransferMessage } from './integration.dto';
import { IntegrationUtils } from './integration.utils';

@Injectable()
export class IntegrationService {
  private readonly utils = new IntegrationUtils();

  private readonly AMO_CRM_QUOTA_WINDOW_IN_SECONDS = 1;

  private readonly CACHE_DELAYED_TRANSFER_MESSAGES_PREFIX = 'transferMessages:delayed:';
  private readonly CACHE_CANCELLED_TRANSFER_MESSAGES_PREFIX = 'transferMessages:cancelled:';

  constructor(
    @Inject(PRISMA) private readonly prisma: PrismaExtendedClientType,
    @Inject(LOGGER_INJECTABLE_NAME) private readonly logger: Logger,
    @Inject(CONFIG) private readonly appConfig: AppConfigType,
    private readonly redis: RedisService,
    private readonly rabbitMq: RabbitMqService,
    private readonly senlerService: SenlerService,
    private readonly amoCrmService: AmoCrmService
  ) {}

  async processBotStepWebhook(body: any) {
    const message: TransferMessage = {
      payload: body,
      metadata: { retryNumber: 0, createdAt: new Date().toISOString(), delay: 0 },
    };

    this.logger.info('Получен запрос', {
      labels: this.extractLoggingLabelsFromRequest(message.payload),
      requestTitle: `Запрос от ${message.metadata.createdAt} (UTC)`,
      data: message,
      status: 'VALIDATING',
    });

    try {
      const instance = plainToInstance(BotStepWebhookDto, message.payload ?? {});
      const validationErrors = await validate(instance);
      message.payload = instance;

      if (validationErrors.length) {
        const details = validationErrors.map(v => v.toString()).join('\n');

        this.logger.error('Ошибка валидации запроса', {
          labels: this.extractLoggingLabelsFromRequest(message.payload),
          details,
          status: 'FAILED',
        });

        return {
          error: 'Validation failed',
          message: details,
        };
      }

      await this.rabbitMq.publishMessage(
        this.appConfig.RABBITMQ_TRANSFER_EXCHANGE,
        this.appConfig.RABBITMQ_TRANSFER_ROUTING_KEY,
        message
      );

      this.logger.info('Запрос принят в обработку', {
        labels: this.extractLoggingLabelsFromRequest(message.payload),
        requestTitle: this.buildProcessWebhookTitle(message.payload),
        status: 'PENDING',
      });

      return { success: true };
    } catch (error) {
      const details = convertExceptionToString(error);

      this.logger.error('Ошибка запроса', {
        labels: this.extractLoggingLabelsFromRequest(message.payload),
        details,
        status: 'FAILED',
      });

      return { error: 'internal', message: details };
    }
  }

  async processTransferMessage(message: TransferMessage, channel: any, originalMessage: any) {
    let { payload, metadata } = message;
    const labels = { requestId: payload.requestUuid };

    this.logger.info('Запрос в процессе обработки', {
      labels: this.extractLoggingLabelsFromRequest(payload),
      metadata,
      status: 'IN PROGRESS',
    });

    const senlerGroup = await this.prisma.senlerGroup.findUniqueWithCache({
      where: { senlerGroupId: payload.senlerGroupId },
    });

    if (!senlerGroup) {
      this.logger.error('Ошибка в результате выполнения запроса', {
        labels,
        details: 'Не найдена Сенлер группа в базе данных',
        status: 'FAILED',
      });
      return;
    }

    const delayedAmoCrmCacheKey = this.buildDelayedAmoCrmCacheKey(senlerGroup.amoCrmAccessToken);
    const cancelledAmoCrmCacheKey = this.buildCancelledAmoCrmCacheKey(senlerGroup.amoCrmAccessToken);

    if (await this.redis.exists(delayedAmoCrmCacheKey)) {
      if (message.metadata.delay < this.appConfig.TRANSFER_MESSAGE_MAX_RETRY_DELAY) {
        this.logger.info('Сообщение отложено', {
          labels,
          details: 'Сообщение отложено из за ограничения по количеству запросов',
          status: 'PENDING',
        });
        await this.republishTransferMessage(message);
      } else {
        this.logger.info('Сообщение отменено', {
          labels,
          details: 'Превышено время в течении которого сообщение могло быть отложено',
          status: 'CANCELLED',
        });
      }
      await channel.nack(originalMessage, false, false);
      await this.senlerService.sendCallbackOnWebhookRequest(message.payload, true);
      return;
    }

    if (await this.redis.exists(cancelledAmoCrmCacheKey)) {
      this.logger.info('Сообщение отменено', {
        labels,
        details: 'AmoCRM токен признан невалидным',
        status: 'CANCELLED',
      });
      await channel.nack(originalMessage, false, false);
      return;
    }

    const tokens = {
      amoCrmAccessToken: senlerGroup.amoCrmAccessToken,
      amoCrmRefreshToken: senlerGroup.amoCrmRefreshToken,
    };

    try {
      const { lead, amoCrmLead } = await this.getOrCreateLeadIfNotExists({
        senlerLeadId: payload.lead.id,
        name: payload.lead.name,
        senlerGroupId: payload.senlerGroupId,
        amoCrmDomainName: senlerGroup.amoCrmDomainName,
        tokens,
      });

      if (payload.publicBotStepSettings.type == BotStepType.SendDataToAmoCrm) {
        await this.sendVarsToAmoCrm(payload, tokens, lead);
      }
      if (payload.publicBotStepSettings.type == BotStepType.SendDataToSenler) {
        await this.sendVarsToSenler(payload, amoCrmLead, senlerGroup.amoCrmAccessToken);
      }

      await this.senlerService.sendCallbackOnWebhookRequest(payload);
      channel.ack(originalMessage);

      this.logger.info('Запрос выполнен успешно', { labels, status: 'SUCCESS' });
    } catch (exception) {
      this.logger.error('Ошибка в результате выполнения запроса', {
        labels,
        status: 'FAILED',
        details: convertExceptionToString(exception),
      });

      if (exception instanceof AxiosError) {
        const exceptionType = this.amoCrmService.getExceptionType(exception);

        if (
          exceptionType === AmoCrmExceptionType.RATE_LIMIT &&
          message.metadata.delay < this.appConfig.TRANSFER_MESSAGE_MAX_RETRY_DELAY
        ) {
          this.logger.info('Сообщение отложено из за ошибки: ' + convertExceptionToString(exception), {
            labels,
            status: 'PENDING',
          });
          const delay = await this.republishTransferMessage(message);

          await channel.nack(originalMessage, false, false);

          await this.redis.set(delayedAmoCrmCacheKey, delay.toString(), this.AMO_CRM_QUOTA_WINDOW_IN_SECONDS);

          this.logger.info('Запрос отложен', { labels, status: 'PENDING' });
        } else {
          const delay = timeToMilliseconds({ days: 1 });

          await channel.nack(originalMessage, false, false);
          await this.senlerService.sendCallbackOnWebhookRequest(message.payload, true);

          await this.redis.set(cancelledAmoCrmCacheKey, delay.toString(), delay / 1000);

          this.logger.info('Запрос отменен', { labels: { requestId: message.payload.requestUuid }, status: 'CANCELLED' });
        }
      }
    }
  }

  async republishTransferMessage(message: TransferMessage): Promise<number> {
    message.metadata.retryNumber++;

    const delay = this.calculateTransferMessageDelay(
      message.metadata.retryNumber,
      this.appConfig.TRANSFER_MESSAGE_BASE_RETRY_DELAY,
      this.appConfig.TRANSFER_MESSAGE_MAX_RETRY_DELAY
    );

    message.metadata.delay = delay;

    await this.rabbitMq.publishMessage(
      this.appConfig.RABBITMQ_TRANSFER_DELAYED_EXCHANGE,
      this.appConfig.RABBITMQ_TRANSFER_ROUTING_KEY,
      message,
      delay
    );
    return delay;
  }

  async sendVarsToAmoCrm(body: BotStepWebhookDto, tokens: AmoCrmTokens, lead: Lead & { senlerGroup: SenlerGroup }) {
    const customFieldsValues = this.utils.convertSenlerVarsToAmoFields(
      body.publicBotStepSettings.syncableVariables,
      body.lead.personalVars
    );

    await this.amoCrmService.editLeadsById({
      amoCrmDomainName: lead.senlerGroup.amoCrmDomainName,
      amoCrmLeadId: lead.amoCrmLeadId,
      tokens,
      customFieldsValues,
    });
  }

  async sendVarsToSenler(body: BotStepWebhookDto, amoCrmLead: AmoCrmLead, apiToken) {
    const client = new SenlerApiClientV2({ apiConfig: { vkGroupId: body.senlerVkGroupId, accessToken: apiToken } });
    const amoCrmLeadCustomFieldsValues = amoCrmLead.custom_fields_values;

    const varsValues = this.utils.convertAmoFieldsToSenlerVars(
      body.publicBotStepSettings.syncableVariables,
      amoCrmLeadCustomFieldsValues
    );

    await Promise.all([
      Promise.all(varsValues.glob_vars.map(globalVar => client.globalVars.set({ name: globalVar.n, value: globalVar.v }))),
      Promise.all(
        varsValues.vars.map(userVar => client.vars.set({ vk_user_id: body.lead.vkUserId, name: userVar.n, value: userVar.v }))
      ),
    ]);
  }

  async getOrCreateLeadIfNotExists({
    senlerLeadId,
    senlerGroupId,
    name,
    tokens,
    amoCrmDomainName,
  }: {
    senlerLeadId: string;
    senlerGroupId: number;
    name: string;
    tokens: AmoCrmTokens;
    amoCrmDomainName: string;
  }): Promise<{
    lead: Lead & { senlerGroup: SenlerGroup };
    amoCrmLead: AmoCrmLead;
  }> {
    let lead = await this.prisma.lead.findUniqueWithCache({ where: { senlerLeadId }, include: { senlerGroup: true } });

    if (lead) {
      const actualAmoCrmLead = await this.amoCrmService.createLeadIfNotExists({
        amoCrmDomainName,
        amoCrmLeadId: lead.amoCrmLeadId,
        name,
        tokens,
      });

      if (lead.amoCrmLeadId != actualAmoCrmLead.id) {
        lead = await this.prisma.lead.updateWithCacheInvalidate({
          where: { amoCrmLeadId: lead.amoCrmLeadId, senlerLeadId },
          include: { senlerGroup: true },
          data: { amoCrmLeadId: actualAmoCrmLead.id },
        });
      }
      return { lead, amoCrmLead: actualAmoCrmLead };
    }

    const newAmoCrmLead = await this.amoCrmService.createLead({
      amoCrmDomainName,
      leads: [{ name }],
      tokens,
    });

    const newLead = await this.prisma.lead.create({
      include: { senlerGroup: true },
      data: {
        amoCrmLeadId: newAmoCrmLead.id,
        senlerLeadId: senlerLeadId,
        senlerGroup: {
          connect: {
            senlerGroupId,
          },
        },
      },
    });

    return {
      lead: newLead,
      amoCrmLead: newAmoCrmLead,
    };
  }

  async getAmoCrmFields(body: GetSenlerGroupFieldsDto) {
    const senlerGroup = await this.prisma.senlerGroup.findUniqueOrThrowWithCache({
      where: { senlerGroupId: body.senlerGroupId },
    });

    const tokens: AmoCrmTokens = {
      amoCrmAccessToken: senlerGroup.amoCrmAccessToken,
      amoCrmRefreshToken: senlerGroup.amoCrmRefreshToken,
    };

    const leadFields = await this.amoCrmService.getLeadFields({
      amoCrmDomainName: senlerGroup.amoCrmDomainName,
      tokens,
    });

    return leadFields;
  }

  public buildProcessWebhookTitle(body: any): string {
    const operation =
      'отправку данных в ' + body.publicBotStepSettings.type === BotStepType.SendDataToAmoCrm ? 'amoCRM' : 'Senler';
    return `Запрос на ${operation} от ${new Date().toLocaleString('UTC')} (UTC)`;
  }

  public extractLoggingLabelsFromRequest(body: any) {
    return {
      groupId: body?.senlerGroupId || 'не указан',
      leadId: body?.lead?.id || 'не указан',
      requestId: body?.requestUuid || 'не указан',
    };
  }

  private calculateTransferMessageDelay(
    retryCount: number,
    base: number = timeToMilliseconds({ minutes: 1 }),
    max: number = timeToMilliseconds({ days: 1 })
  ) {
    const randomFactor = 0.8 + Math.random() * 0.4;
    return Math.min(base * 2 ** retryCount * randomFactor, max);
  }

  public buildCancelledAmoCrmCacheKey = (accessToken: string) => this.CACHE_CANCELLED_TRANSFER_MESSAGES_PREFIX + accessToken;
  public buildDelayedAmoCrmCacheKey = (accessToken: string) => this.CACHE_DELAYED_TRANSFER_MESSAGES_PREFIX + accessToken;
}
