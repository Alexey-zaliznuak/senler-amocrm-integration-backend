import { Inject, Injectable } from '@nestjs/common';
import { AmoCrmProfile, Lead, SenlerGroup } from '@prisma/client';
import * as amqp from 'amqplib';
import { AxiosError } from 'axios';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ApiError, SenlerApiClientV2 } from 'senler-sdk';
import { AmoCrmService } from 'src/external/amo-crm';
import { AmoCrmError, AmoCrmExceptionType, GetLeadResponse as AmoCrmLead, AmoCrmTokens } from 'src/external/amo-crm/amo-crm.dto';
import { AMO_CRM_RATE_LIMIT_WINDOW_IN_SECONDS, RateLimitsService } from 'src/external/amo-crm/rate-limit.service';
import { SenlerService } from 'src/external/senler/senler.service';
import { AppConfigType } from 'src/infrastructure/config/config.app-config';
import { CONFIG } from 'src/infrastructure/config/config.module';
import { PRISMA } from 'src/infrastructure/database/database.config';
import { PrismaExtendedClientType } from 'src/infrastructure/database/database.service';
import { AmqpSerializedMessage } from 'src/infrastructure/rabbitmq/events/amqp.service';
import { RabbitMqService } from 'src/infrastructure/rabbitmq/rabbitmq.service';
import { RedisService } from 'src/infrastructure/redis/redis.service';
import { convertExceptionToString, timeToMilliseconds, timeToSeconds } from 'src/utils';
import { Logger } from 'winston';
import { LOGGER_INJECTABLE_NAME } from './integration.config';
import { BotStepType, BotStepWebhookDto, TransferMessage } from './integration.dto';
import { IntegrationUtils } from './integration.utils';

@Injectable()
export class IntegrationService {
  private readonly utils = new IntegrationUtils();

  private readonly CACHE_DELAYED_TRANSFER_MESSAGES_PREFIX = 'transferMessages:delayed:';
  private readonly CACHE_CANCELLED_TRANSFER_MESSAGES_PREFIX = 'transferMessages:cancelled:';

  constructor(
    @Inject(PRISMA) private readonly prisma: PrismaExtendedClientType,
    @Inject(LOGGER_INJECTABLE_NAME) private readonly logger: Logger,
    @Inject(CONFIG) public readonly config: AppConfigType,
    private readonly redis: RedisService,
    private readonly rabbitMq: RabbitMqService,
    private readonly senlerService: SenlerService,
    private readonly amoCrmService: AmoCrmService,
    public readonly rateLimitsService: RateLimitsService
  ) {}

  // async t() {
  //   return await this.prisma.lead.deleteMany({ where: { id: {not: '1'} } });
  // }

  async processBotStepWebhook(body: any) {
    const message: TransferMessage = {
      payload: body,
      metadata: { retryNumber: 0, createdAt: new Date().toISOString(), delay: 0 },
    };

    const labels = this.extractLoggingLabelsFromRequest(message.payload);

    this.logger.info('Получен запрос', {
      labels,
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
          labels,
          details,
          status: 'FAILED',
        });

        return {
          error: 'Validation failed',
          message: details,
        };
      }

      await this.rabbitMq.publishMessage(
        this.config.RABBITMQ_TRANSFER_EXCHANGE,
        this.config.RABBITMQ_TRANSFER_ROUTING_KEY,
        message
      );

      this.logger.info('Запрос принят в обработку', {
        labels,
        requestTitle: this.buildProcessWebhookTitle(message.payload),
        status: 'PENDING',
      });

      return { success: true };
    } catch (error) {
      const details = convertExceptionToString(error);

      this.logger.error('Ошибка запроса', {
        labels,
        details,
        status: 'FAILED',
      });

      return { error: 'internal', message: details };
    }
  }

  async processTransferMessage(
    message: TransferMessage,
    channel: amqp.Channel,
    originalMessage: AmqpSerializedMessage<TransferMessage>
  ) {
    let { payload, metadata } = message;
    const labels = { requestId: payload.requestUuid };

    this.logger.info('Запрос в процессе обработки', {
      labels: this.extractLoggingLabelsFromRequest(payload),
      metadata,
      status: 'IN PROGRESS',
    });

    const senlerGroup = await this.prisma.senlerGroup.findUniqueWithCache({
      where: { senlerGroupId: payload.senlerGroupId },
      include: { amoCrmProfile: true },
    });

    if (!senlerGroup) {
      this.logger.error('Ошибка в результате выполнения запроса', {
        labels,
        details: 'Не найдена Сенлер группа в базе данных',
        status: 'FAILED',
      });
      return;
    }

    // Проверяем что ключ не в отложенных(при 429 блокируем ключ на секунду) и не заблоченных
    const delayedAmoCrmCacheKey = this.buildDelayedAmoCrmCacheKey(senlerGroup.amoCrmProfile.accessToken);
    // const cancelledAmoCrmCacheKey = this.buildCancelledAmoCrmCacheKey(senlerGroup.amoCrmProfile.refreshToken);

    if (await this.redis.exists(delayedAmoCrmCacheKey)) {
      await this.republishTransferMessageWithLongerDelay(message, labels, channel, originalMessage);
      return;
    }

    // if (await this.redis.exists(cancelledAmoCrmCacheKey)) {
    //   this.logger.info('Сообщение отменено', {
    //     labels,
    //     details: 'AmoCRM токен признан невалидным',
    //     status: 'CANCELLED',
    //   });
    //   channel.nack(originalMessage as any, false, false);
    //   return;
    // }

    const tokens = {
      accessToken: senlerGroup.amoCrmProfile.accessToken,
      refreshToken: senlerGroup.amoCrmProfile.refreshToken,
    };

    try {
      const { lead, amoCrmLead } = await this.getOrCreateLeadIfNotExists({
        senlerLeadId: payload.lead.id,
        name: payload.lead.name,
        senlerGroupId: payload.senlerGroupId,
        amoCrmDomainName: senlerGroup.amoCrmProfile.domainName,
        tokens,
      });

      if (payload.publicBotStepSettings.type == BotStepType.SendDataToAmoCrm) {
        await this.sendVarsToAmoCrm(payload, tokens, lead);
      }
      if (payload.publicBotStepSettings.type == BotStepType.SendDataToSenler) {
        await this.sendVarsToSenler(payload, amoCrmLead, senlerGroup.senlerApiAccessToken);
      }

      await this.senlerService.sendCallbackOnWebhookRequest(payload);
      channel.ack(originalMessage as any);

      this.logger.info('Запрос выполнен успешно', { labels, status: 'SUCCESS' });
    } catch (error) {
      this.logger.error('Ошибка в результате выполнения запроса', {
        labels,
        status: 'FAILED',
        exception: {
          message: convertExceptionToString(error),
          stack: error.stack,
          amoType: error instanceof AmoCrmError ? error.type : null,
          preliminary: error instanceof AmoCrmError ? error.preliminary : false,
        },
      });

      if (error instanceof AxiosError || error instanceof AmoCrmError) {
        const exception = this.amoCrmService.getExceptionType(error);
        const exceptionType = exception.type;
        const humanMessage = exception.humanMessage;

        // сохраняем все ошибки в redis
        if (exceptionType != AmoCrmExceptionType.TOO_MANY_REQUESTS) {
          await this.saveSenlerGroupErrorMessage(senlerGroup.senlerGroupId, humanMessage);
        }

        // если сообщение слишком долго ретраится - отменяем его
        if (!(message.metadata.delay < this.config.TRANSFER_MESSAGE_MAX_RETRY_DELAY)) {
          this.logger.info('Запрос отменен без блокировки ключей, из-за исчерпания попыток', {
            labels: { requestId: message.payload.requestUuid },
            exception: {
              humanMessage,
              message: convertExceptionToString(error),
              delay: message.metadata.delay,
              max_delay: this.config.TRANSFER_MESSAGE_MAX_RETRY_DELAY,
              type: exceptionType,
            },
            status: 'CANCELLED',
          });
          channel.nack(originalMessage as any, false, false);
          await this.senlerService.sendCallbackOnWebhookRequest(message.payload, true);
          return;
        }

        this.logger.info('Сообщение не получилось выполнить из-за ошибки: ' + convertExceptionToString(error), {
          labels,
          status: 'FAILED',
          exception: {
            message: convertExceptionToString(error),
            type: exceptionType,
          },
        });

        const delay = await this.publishTransferMessageWithLongerDelay(message);

        channel.nack(originalMessage as any, false, false);

        // откладываем выполнение запросов для этого аккаунта на секунду
        // возможно в будущем разделить логику для TOO_MANY_REQUESTS и других
        await this.redis.set(delayedAmoCrmCacheKey, delay.toString(), AMO_CRM_RATE_LIMIT_WINDOW_IN_SECONDS);

        this.logger.info('Запрос отложен', { labels, status: 'PENDING' });
        //     } else if (exceptionType === AmoCrmExceptionType.INVALID_DATA_STRUCTURE) {
        //       channel.nack(originalMessage as any, false, false);
        //       this.logger.info('Запрос отменен без блокировки ключей, из-за некорректных данных или превышения лимитов по открытым сжелкам', {
        //         exception: {
        //           type: exceptionType,
        //           message: convertExceptionToString(error),
        //         },
        //         labels: { requestId: message.payload.requestUuid },
        //         status: 'CANCELLED',
        //       });
        //     } else {
        //       const delay = timeToMilliseconds({ minutes: 1 });

        //       channel.nack(originalMessage as any, false, false);
        //       await this.senlerService.sendCallbackOnWebhookRequest(message.payload, true);

        //       await this.redis.set(cancelledAmoCrmCacheKey, delay.toString(), delay / 1000);

        //       this.logger.info('Запрос отменен с блокировкой ключей', {
        //         labels: { requestId: message.payload.requestUuid },
        //         exception: {
        //           message: convertExceptionToString(message),
        //           type: exceptionType,
        //         },
        //         status: 'CANCELLED',
        //       });
        //     }
        //   }
        // }
      } else {
        this.logger.error('Не удалось обработать ошибку при выполнении запроса - ошибка не является ошибкой axios или amo crm', {
          labels,
        });
      }
    }
  }

  async republishTransferMessageWithLongerDelay(
    message: TransferMessage,
    labels: object,
    channel: amqp.Channel,
    originalMessage: AmqpSerializedMessage
  ) {
    if (message.metadata.delay < this.config.TRANSFER_MESSAGE_MAX_RETRY_DELAY) {
      this.logger.info('Сообщение отложено', {
        labels,
        details: 'Сообщение отложено из-за ограничения по количеству запросов',
        status: 'PENDING',
      });
      await this.publishTransferMessageWithLongerDelay(message);
    } else {
      this.logger.info('Сообщение отменено', {
        labels,
        details: 'Превышено время в течении которого сообщение могло быть отложено',
        status: 'CANCELLED',
        delay: message.metadata.delay,
        mxDelay: this.config.TRANSFER_MESSAGE_MAX_RETRY_DELAY,
      });
    }
    channel.nack(originalMessage as any, false, false);
    await this.senlerService.sendCallbackOnWebhookRequest(message.payload, true);
  }

  async publishTransferMessageWithLongerDelay(message: TransferMessage): Promise<number> {
    message.metadata.retryNumber++;

    const delay = this.calculateTransferMessageDelay(message.metadata.retryNumber, this.config.TRANSFER_MESSAGE_BASE_RETRY_DELAY);

    message.metadata.delay = delay;

    await this.rabbitMq.publishMessage(
      this.config.RABBITMQ_TRANSFER_DELAYED_EXCHANGE,
      this.config.RABBITMQ_TRANSFER_ROUTING_KEY,
      message,
      delay
    );
    return delay;
  }

  async sendVarsToAmoCrm(
    body: BotStepWebhookDto,
    tokens: AmoCrmTokens,
    lead: Lead & { senlerGroup: SenlerGroup & { amoCrmProfile: AmoCrmProfile } }
  ) {
    const customFieldsValues = this.utils.convertSenlerVarsToAmoFields(
      body.publicBotStepSettings.syncableVariables,
      body.lead.personalVars || {}
    );

    await this.amoCrmService.editLeadsById({
      amoCrmDomainName: lead.senlerGroup.amoCrmProfile.domainName,
      amoCrmLeadId: lead.amoCrmLeadId,
      tokens,
      customFieldsValues,
    });
  }

  async sendVarsToSenler(body: BotStepWebhookDto, amoCrmLead: AmoCrmLead, senlerAccessToken: string) {
    const client = new SenlerApiClientV2({ apiConfig: { vkGroupId: body.senlerVkGroupId, accessToken: senlerAccessToken } });
    const amoCrmLeadCustomFieldsValues = amoCrmLead.custom_fields_values || {};

    const varsValues = this.utils.convertAmoFieldsToSenlerVars(
      body.publicBotStepSettings.syncableVariables,
      amoCrmLeadCustomFieldsValues
    );

    try {
      await Promise.all([
        Promise.all(varsValues.glob_vars.map(globalVar => client.globalVars.set({ name: globalVar.n, value: globalVar.v }))),
        Promise.all(
          varsValues.vars.map(userVar => client.vars.set({ vk_user_id: body.lead.vkUserId, name: userVar.n, value: userVar.v }))
        ),
      ]);
    } catch (error) {
      if (error instanceof ApiError) {
        await this.saveSenlerGroupErrorMessage(
          body.senlerGroupId,
          `Ошибка Сенлер ${error.errorCode}: ${error.name}, ${error.message}`
        );
      }
    }
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
    lead: Lead & { senlerGroup: SenlerGroup & { amoCrmProfile: AmoCrmProfile } };
    amoCrmLead: AmoCrmLead;
  }> {
    const lockKey = `lead:create:${senlerLeadId}`;
    const lockTtl = timeToMilliseconds({ seconds: 10 });

    let lockAcquired = await this.redis.acquireLock(lockKey, lockTtl);
    while (!lockAcquired) {
      await new Promise(resolve => setTimeout(resolve, 100));
      const existingLead = await this.prisma.lead.findUnique({
        where: { senlerLeadId },
        include: { senlerGroup: { include: { amoCrmProfile: true } } },
      });
      if (existingLead) {
        const actualAmoCrmLead = await this.amoCrmService.createLeadIfNotExists({
          amoCrmDomainName,
          amoCrmLeadId: existingLead.amoCrmLeadId,
          name,
          tokens,
        });
        if (existingLead.amoCrmLeadId != actualAmoCrmLead.id) {
          const updatedLead = await this.prisma.lead.update({
            where: { amoCrmLeadId: existingLead.amoCrmLeadId, senlerLeadId },
            include: { senlerGroup: { include: { amoCrmProfile: true } } },
            data: { amoCrmLeadId: actualAmoCrmLead.id },
          });
          return { lead: updatedLead, amoCrmLead: actualAmoCrmLead };
        }
        return { lead: existingLead, amoCrmLead: actualAmoCrmLead };
      }
      lockAcquired = await this.redis.acquireLock(lockKey, lockTtl);
    }

    try {
      let lead = await this.prisma.lead.findUnique({
        where: { senlerLeadId },
        include: { senlerGroup: { include: { amoCrmProfile: true } } },
      });

      if (lead) {
        const actualAmoCrmLead = await this.amoCrmService.createLeadIfNotExists({
          amoCrmDomainName,
          amoCrmLeadId: lead.amoCrmLeadId,
          name,
          tokens,
        });

        if (lead.amoCrmLeadId != actualAmoCrmLead.id) {
          lead = await this.prisma.lead.update({
            where: { amoCrmLeadId: lead.amoCrmLeadId, senlerLeadId },
            include: { senlerGroup: { include: { amoCrmProfile: true } } },
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
      this.logger.info('Создан лид, причина: нету лида с таким senlerLeadId в базе', {
        labels: { senlerLeadId, newAmoCrmLead: newAmoCrmLead.id },
      });
      const newLead = await this.prisma.lead.create({
        include: { senlerGroup: { include: { amoCrmProfile: true } } },
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
    } finally {
      await this.redis.releaseLock(lockKey);
    }
  }

  async getAmoCrmFields(senlerGroupId: number) {
    const senlerGroup = await this.prisma.senlerGroup.findUniqueOrThrowWithCache({
      where: { senlerGroupId },
      include: { amoCrmProfile: true },
    });

    const tokens: AmoCrmTokens = {
      accessToken: senlerGroup.amoCrmProfile.accessToken,
      refreshToken: senlerGroup.amoCrmProfile.refreshToken,
    };

    try {
      return await this.amoCrmService.getLeadFields({
        amoCrmDomainName: senlerGroup.amoCrmProfile.domainName,
        tokens,
      });
    } catch (error) {
      if (error instanceof AxiosError) {
        return {
          error: {
            name: 'Error during request to AmoCrm',
            code: error.status,
            message: error.status === 402 ? 'Проверьте оплату тарифа в аккаунте' : 'Отсутствует подробная информация',
          },
        };
      }
    }
  }

  async unlinkAmoAccount(senlerGroupId: number) {
    return await this.prisma.senlerGroup.deleteWithCacheInvalidate({
      where: { senlerGroupId },
    });
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

  public async getSenlerGroupErrorMessage(senlerGroupId: number) {
    const key = this.buildSenlerGroupErrorMessagesCacheKey(senlerGroupId);
    return (await this.redis.getSetMembers(key)).join(';');
  }

  public async saveSenlerGroupErrorMessage(senlerGroupId: number, message: string) {
    const key = this.buildSenlerGroupErrorMessagesCacheKey(senlerGroupId);
    const createdNewSet = await this.redis.createSetIfNotExists(key, [message], timeToSeconds({ days: 7 }));
    if (!createdNewSet) await this.redis.addToSet(key, message);
  }

  public async deleteSenlerGroupErrorMessages(senlerGroupId: number) {
    const key = this.buildSenlerGroupErrorMessagesCacheKey(senlerGroupId);
    await this.redis.deleteSet(key);
  }

  private calculateTransferMessageDelay(retryCount: number, base: number = timeToMilliseconds({ minutes: 1 })) {
    const mx = timeToMilliseconds({ days: 1 });

    const delay = 2 ** retryCount * (1 + Math.random()) * base;

    this.logger.info('DELAY', {
      delay_calc: delay,
      delay_in_result: Math.min(delay, mx),
      2: retryCount,
      3: 1 + Math.random(),
      4: base,
      dayToMilliseconds: timeToMilliseconds({ days: 1 }),
      mx: mx,
    });

    return Math.min(delay, mx);
  }

  // public buildCancelledAmoCrmCacheKey = (accessToken: string) => this.CACHE_CANCELLED_TRANSFER_MESSAGES_PREFIX + accessToken;
  public buildDelayedAmoCrmCacheKey = (accessToken: string) => this.CACHE_DELAYED_TRANSFER_MESSAGES_PREFIX + accessToken;
  public buildSenlerGroupErrorMessagesCacheKey = (senlerGroupId: number) => `senlerGroupErrors:${senlerGroupId}`;
}
