import { Inject, Injectable } from '@nestjs/common';
import { Lead, SenlerGroup } from '@prisma/client';
import { AxiosError } from 'axios';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { SenlerApiClientV2 } from 'senler-sdk';
import { AmoCrmService } from 'src/external/amo-crm';
import { AmoCrmErrorType, GetLeadResponse as AmoCrmLead, AmoCrmTokens } from 'src/external/amo-crm/amo-crm.dto';
import { SenlerService } from 'src/external/senler/senler.service';
import { AppConfigType } from 'src/infrastructure/config/config.app-config';
import { CONFIG } from 'src/infrastructure/config/config.module';
import { PRISMA } from 'src/infrastructure/database/database.config';
import { PrismaExtendedClientType } from 'src/infrastructure/database/database.service';
import { RabbitMqService } from 'src/infrastructure/rabbitMq/rabbitMq.service';
import { convertExceptionToString } from 'src/utils';
import { Logger } from 'winston';
import { LOGGER_INJECTABLE_NAME } from './integration.config';
import { BotStepType, BotStepWebhookDto, GetSenlerGroupFieldsDto, TransferMessage } from './integration.dto';
import { IntegrationUtils } from './integration.utils';

@Injectable()
export class IntegrationService {
  private readonly utils = new IntegrationUtils();

  constructor(
    @Inject(PRISMA) private readonly prisma: PrismaExtendedClientType,
    @Inject(LOGGER_INJECTABLE_NAME) private readonly logger: Logger,
    @Inject(CONFIG) private readonly appConfig: AppConfigType,
    private readonly rabbitMq: RabbitMqService,
    private readonly senlerService: SenlerService,
    private readonly amoCrmService: AmoCrmService
  ) {}

  async processBotStepWebhook(body: any) {
    const message: TransferMessage = { payload: body, metadata: { retryNumber: 0, createdAt: new Date().toISOString() } };

    this.logger.info('Получен запрос', {
      labels: this.extractLoggingLabelsFromRequest(message.payload),
      requestTitle: `Запрос от ${message.metadata.createdAt} (UTC)`,
      message,
      status: 'VALIDATING',
    });

    try {
      const validationErrors = await validate(plainToInstance(BotStepWebhookDto, message.payload ?? {}));

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

    // если в редисе.отмененные ключи - отменить запрос
    // если в редисе.отложенные ключи - отложить запрос

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

      await this.senlerService.acceptWebhookRequest(payload);
      channel.ack(originalMessage);

      this.logger.error('Запрос выполнен успешно', { labels, status: 'SUCCESS' });
    } catch (exception) {
      this.logger.error('Ошибка в результате выполнения запроса', {
        labels,
        status: 'FAILED',
        details: convertExceptionToString(exception),
      });

      if (exception instanceof AxiosError) {
        const amoCrmExceptionType = this.amoCrmService.getExceptionType(exception);

        // this.checkExceptionRetryable()
        if (false) {
          this.republishTransferMessage(message);
          await channel.nack(originalMessage, false, false);
          // set token to redis.delayed
          return;
        }
        else {
          this.logger.info('Запрос отменен', { labels, status: 'CANCELLED' });
          await channel.nack(originalMessage, false, false);
          // set token to redis.cancelled
          // send error to senler
        }
      }
    }
  }

  async republishTransferMessage(message: TransferMessage) {
    message.metadata.retryNumber++;

    const delay = this.calculateTransferMessageDelay(
      message.metadata.retryNumber,
      this.appConfig.TRANSFER_MESSAGE_RETRY_DELAY_BASE,
      this.appConfig.TRANSFER_MESSAGE_MAX_RETRY_DELAY
    );

    await this.rabbitMq.publishMessage(
      this.appConfig.RABBITMQ_TRANSFER_EXCHANGE, // queued exchange
      this.appConfig.RABBITMQ_TRANSFER_ROUTING_KEY,
      message,
      // DELAY
    );

    this.logger.info('Запрос отложен', { labels: { requestId: message.payload.requestUuid }, status: 'PENDING RETRYING' });
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

  private calculateTransferMessageDelay(retryCount: number, base: number = 1000, max: number) {
    const randomFactor = 0.8 + Math.random() * 0.4;
    return Math.min(base * 2 ** retryCount * randomFactor, max);
  }
}
