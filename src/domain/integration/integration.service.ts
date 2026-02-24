import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  InternalServerErrorException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { AmoCrmProfile, Lead, SenlerGroup } from '@prisma/client';
import * as amqp from 'amqplib';
import { AxiosError, HttpStatusCode } from 'axios';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ApiError, SenlerApiClientV2 } from 'senler-sdk';
import { AmoCrmService } from 'src/external/amo-crm';
import {
  AmoCrmError,
  AmoCrmExceptionType,
  GetLeadResponse as AmoCrmLead,
  AmoCrmTokens,
  CreateLeadDto,
} from 'src/external/amo-crm/amo-crm.dto';
import { RateLimitsService } from 'src/external/amo-crm/rate-limit.service';
import { SenlerService } from 'src/external/senler/senler.service';
import { AppConfig, AppConfigType } from 'src/infrastructure/config/config.app-config';
import { CONFIG } from 'src/infrastructure/config/config.module';
import { PRISMA } from 'src/infrastructure/database/database.config';
import { PrismaExtendedClientType } from 'src/infrastructure/database/database.service';
import { AmqpSerializedMessage } from 'src/infrastructure/rabbitmq/events/amqp.service';
import { RabbitMqService } from 'src/infrastructure/rabbitmq/rabbitmq.service';
import { RedisService } from 'src/infrastructure/redis/redis.service';
import { convertExceptionToString, timeToMilliseconds, timeToSeconds } from 'src/utils';
import { Logger } from 'winston';
import { SenlerGroupsService } from '../senlerGroups/senler-groups.service';
import { AmoCrmWorkspaceInfoDto } from './dto/get-workspace-info.dto';
import { BotStepType, BotStepWebhookDto, ChangeAmoCrmAccountRequestDto, TransferMessage } from './dto/integration.dto';
import { LOGGER_INJECTABLE_NAME } from './integration.config';
import { IntegrationUtils } from './integration.utils';

@Injectable()
export class IntegrationService {
  private readonly utils = new IntegrationUtils();

  private readonly CACHE_DELAYED_TRANSFER_MESSAGES_PREFIX = 'transferMessages:delayed:';

  constructor(
    @Inject(PRISMA) private readonly prisma: PrismaExtendedClientType,
    @Inject(LOGGER_INJECTABLE_NAME) private readonly logger: Logger,
    @Inject(CONFIG) public readonly config: AppConfigType,
    private readonly redis: RedisService,
    private readonly rabbitMq: RabbitMqService,
    private readonly senlerService: SenlerService,
    private readonly amoCrmService: AmoCrmService,
    private readonly senlerGroupsService: SenlerGroupsService,
    public readonly rateLimitsService: RateLimitsService
  ) {}

  public getConf() {
    return { conf: AppConfig, env: process.env };
  }

  async changeAmoCrmAccount(body: ChangeAmoCrmAccountRequestDto): Promise<void> {
    const senlerGroup = await this.prisma.senlerGroup.findUniqueOrThrowWithCache({
      where: { senlerGroupId: body.senlerGroupId },
    });

    try {
      const amoCrmProfile = await this.senlerGroupsService.getOrCreateAmoCrmProfile(body);

      await this.prisma.senlerGroup.updateWithCacheInvalidate({
        where: { id: senlerGroup.id },
        data: {
          amoCrmProfile: { connect: { id: amoCrmProfile.id } },
        },
      });
    } catch (error) {
      if (error instanceof ServiceUnavailableException) {
        throw error;
      }

      if (error instanceof AxiosError && error.status === HttpStatusCode.BadRequest) {
        throw new ServiceUnavailableException();
      }

      if (error instanceof AxiosError && error.code === 'ENOTFOUND') {
        throw new BadRequestException('Некорректное доменное имя аккаунта amoCRM');
      }

      throw error;
    }
  }

  async processBotStepWebhook(body: any) {
    const message: TransferMessage = {
      payload: body,
      metadata: { retryNumber: 0, createdAt: new Date().toISOString(), delay: 0 },
    };

    const labels = this.extractLoggingLabelsFromRequest(message.payload);
    const logger = this.logger.child({ labels });

    logger.info('Получен запрос', {
      requestTitle: `Запрос от ${message.metadata.createdAt} (UTC)`,
      data: message,
      status: 'VALIDATING',
    });

    try {
      const instance = plainToInstance(BotStepWebhookDto, message.payload ?? {});
      const validationErrors = await validate(instance);

      if (validationErrors.length) {
        const details = validationErrors.map(e => ({
          field: e.property,
          errors: Object.values(e.constraints ?? {}),
        }));

        logger.error('Ошибка валидации запроса', {
          labels,
          details,
          status: 'FAILED',
        });

        throw new BadRequestException({
          code: 'VALIDATION_ERROR',
          message: 'Invalid webhook payload',
          details,
        });
      }

      message.payload = this.withSenlerVarsFormatting(instance);

      await this.rabbitMq.publishMessage(
        this.config.RABBITMQ_TRANSFER_EXCHANGE,
        this.config.RABBITMQ_TRANSFER_ROUTING_KEY,
        message
      );

      logger.info('Запрос принят в обработку', {
        requestTitle: this.buildProcessWebhookTitle(message.payload),
        status: 'PENDING',
      });

      return { success: true };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      const details = convertExceptionToString(error);

      logger.error('Ошибка запроса', {
        labels,
        details,
        status: 'FAILED',
      });

      throw new InternalServerErrorException('INTERNAL_SERVER_ERROR', details);
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

    // Не используем кеш для токенов - они могут быть обновлены параллельным запросом
    const senlerGroup = await this.prisma.senlerGroup.findUnique({
      where: { senlerGroupId: payload.senlerGroupId },
      include: { amoCrmProfile: true },
    });

    if (!senlerGroup) {
      this.logger.error('Ошибка в результате выполнения запроса', {
        labels,
        details: 'Не найдена Сенлер группа в базе данных',
        status: 'FAILED',
      });
      channel.nack(originalMessage as any, false, false);
      return;
    }

    // Проверяем что ключ не в отложенных(при 429 блокируем ключ на секунду) и не заблоченных
    const delayedAmoCrmCacheKey = this.buildDelayedAmoCrmCacheKey(senlerGroup.amoCrmProfile.accessToken);
    if (await this.redis.exists(delayedAmoCrmCacheKey)) {
      await this.republishTransferMessageWithLongerDelay(message, labels, channel, originalMessage);
      return;
    }

    const tokens = {
      accessToken: senlerGroup.amoCrmProfile.accessToken,
      refreshToken: senlerGroup.amoCrmProfile.refreshToken,
    };

    try {
      const { lead, amoCrmLead } = await this.getOrCreateLeadIfNotExists({
        senlerLeadId: payload.lead.id,
        senlerGroupId: payload.senlerGroupId,
        amoCrmDomainName: senlerGroup.amoCrmProfile.domainName,
        name: payload.publicBotStepSettings.amoCrmTransferringSettings.name,
        price: payload.publicBotStepSettings.amoCrmTransferringSettings.price
          ? +payload.publicBotStepSettings.amoCrmTransferringSettings.price
          : undefined,
        createContact: payload.publicBotStepSettings.amoCrmTransferringSettings.createContact,
        statusId: payload.publicBotStepSettings.amoCrmTransferringSettings.statusId ?? undefined,
        pipelineId: payload.publicBotStepSettings.amoCrmTransferringSettings.pipelineId ?? undefined,
        responsibleUserId: payload.publicBotStepSettings.amoCrmTransferringSettings.responsibleUserId ?? undefined,
        tokens,
        labels,
      });

      if (payload.publicBotStepSettings.type == BotStepType.SendDataToAmoCrm) {
        await this.sendVarsToAmoCrm(payload, tokens, lead, labels);
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

      this.logger.info('TIME DEBUG', {
        1: Date.now(),
        2: new Date(message.metadata.createdAt).getTime(),
        3: this.config.TRANSFER_MESSAGE_MAX_RETRY_DELAY,
        4: Date.now() - new Date(message.metadata.createdAt).getTime(),
        5: Date.now() - new Date(message.metadata.createdAt).getTime() > this.config.TRANSFER_MESSAGE_MAX_RETRY_DELAY,
      });

      // отдельная обработка для ошибок сенлер
      if (error instanceof ApiError) {
        const humanMessage = `Ошибка Сенлер ${error.errorCode}: ${error.name}, ${error.message}`;

        await this.saveSenlerGroupErrorMessage(message.payload.senlerGroupId, humanMessage);

        // если долго ретраится - отменяем
        if (this.checkMessageExpired(message)) {
          this.logger.info('Запрос отменен из-за исчерпания попыток', {
            labels: { requestId: message.payload.requestUuid },
            exception: {
              humanMessage,
              message: convertExceptionToString(error),
              delay: message.metadata.delay,
              max_delay: this.config.TRANSFER_MESSAGE_MAX_RETRY_DELAY,
              type: 'SenlerApiError',
            },
            status: 'CANCELLED',
          });
          await this.senlerService.sendCallbackOnWebhookRequest(message.payload, true);
          channel.nack(originalMessage as any, false, false);
          return;
        }

        await this.publishTransferMessageWithLongerDelay(message);
        channel.nack(originalMessage as any, false, false);

        this.logger.info('Запрос отложен', { labels, status: 'PENDING' });
      } else if (error instanceof AxiosError || error instanceof AmoCrmError) {
        const AmoCrmException = await this.amoCrmService.getExceptionType(error, senlerGroup.amoCrmProfile.domainName, tokens);

        // сохраняем все ошибки в redis
        if (AmoCrmException.type != AmoCrmExceptionType.TOO_MANY_REQUESTS) {
          await this.saveSenlerGroupErrorMessage(senlerGroup.senlerGroupId, AmoCrmException.humanMessage);
        }

        // если передалось невалидное значение переменной - не ретраим
        if (AmoCrmException.type === AmoCrmExceptionType.VARIABLE_TYPE_ERROR) {
          this.logger.info('Запрос отменен из-за не валидных данных переменных', {
            labels: { requestId: message.payload.requestUuid },
            exception: {
              amoCrmException: AmoCrmException,
              message: convertExceptionToString(error),
              webhook: payload,
            },
            status: 'CANCELLED',
          });
          await this.senlerService.sendCallbackOnWebhookRequest(message.payload, true);
          channel.nack(originalMessage as any, false, false);
          return;
        }

        // если сообщение слишком долго ретраится - отменяем его
        if (this.checkMessageExpired(message)) {
          this.logger.info('Запрос отменен из-за исчерпания попыток', {
            labels: { requestId: message.payload.requestUuid },
            exception: {
              amoCrmException: AmoCrmException,
              message: convertExceptionToString(error),
              delay: message.metadata.delay,
              max_delay: this.config.TRANSFER_MESSAGE_MAX_RETRY_DELAY,
            },
            status: 'CANCELLED',
          });
          await this.senlerService.sendCallbackOnWebhookRequest(message.payload, true);
          channel.nack(originalMessage as any, false, false);
          return;
        }

        const delay = await this.publishTransferMessageWithLongerDelay(message);
        channel.nack(originalMessage as any, false, false);

        await this.redis.set(delayedAmoCrmCacheKey, delay.toString(), timeToSeconds({ seconds: 1 }));
        this.logger.info('Запрос отложен', { labels, status: 'PENDING' });
      } else {
        this.logger.error('Не удалось обработать ошибку при выполнении запроса', {
          labels,
          status: 'CANCELLED',
          exception: {
            message: convertExceptionToString(error),
            stack: error.stack,
            amoType: error instanceof AmoCrmError ? error.type : null,
            preliminary: error instanceof AmoCrmError ? error.preliminary : false,
          },
        });
        await this.senlerService.sendCallbackOnWebhookRequest(message.payload, true);
        channel.nack(originalMessage as any, false, false);
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
      await this.senlerService.sendCallbackOnWebhookRequest(message.payload, true);
    }
    channel.nack(originalMessage as any, false, false);
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
    lead: Lead & { senlerGroup: SenlerGroup & { amoCrmProfile: AmoCrmProfile } },
    labels: { requestId: string }
  ) {
    const customFieldsValues = this.utils.convertSenlerVarsToAmoFields(
      body.publicBotStepSettings.syncableVariables,
      body.lead.personalVars || {}
    );

    this.logger.info('Отправка переменных', { labels });

    await this.amoCrmService.editLeadsById({
      amoCrmDomainName: lead.senlerGroup.amoCrmProfile.domainName,
      amoCrmLeadId: lead.amoCrmLeadId,
      name: body.publicBotStepSettings.amoCrmTransferringSettings.name ?? undefined,
      price: body.publicBotStepSettings.amoCrmTransferringSettings.price
        ? +body.publicBotStepSettings.amoCrmTransferringSettings.price
        : undefined,
      statusId: body.publicBotStepSettings.amoCrmTransferringSettings.statusId ?? undefined,
      pipelineId: body.publicBotStepSettings.amoCrmTransferringSettings.pipelineId ?? undefined,
      responsibleUserId: body.publicBotStepSettings.amoCrmTransferringSettings.responsibleUserId ?? undefined,
      tokens,
      customFieldsValues,
      labels,
    });
  }

  async sendVarsToSenler(body: BotStepWebhookDto, amoCrmLead: AmoCrmLead, senlerAccessToken: string) {
    const client = new SenlerApiClientV2({ apiConfig: { vkGroupId: body.senlerVkGroupId, accessToken: senlerAccessToken } });
    const amoCrmLeadCustomFieldsValues = amoCrmLead.custom_fields_values || {};

    const varsValues = this.utils.convertAmoFieldsToSenlerVars(
      body.publicBotStepSettings.syncableVariables,
      amoCrmLeadCustomFieldsValues
    );

    this.logger.info('Отправка переменных в сенлер', { labels: this.extractLoggingLabelsFromRequest(body), vars: varsValues });

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
    price,
    statusId,
    pipelineId,
    createContact,
    responsibleUserId,
    tokens,
    amoCrmDomainName,
    labels,
  }: {
    senlerLeadId: string;
    senlerGroupId: number;
    name?: string;
    price?: number;
    statusId?: number;
    pipelineId?: number;
    createContact: boolean;
    responsibleUserId?: number;
    tokens: AmoCrmTokens;
    amoCrmDomainName: string;
    labels: { requestId: string };
  }): Promise<{
    lead: Lead & { senlerGroup: SenlerGroup & { amoCrmProfile: AmoCrmProfile } };
    amoCrmLead: AmoCrmLead;
  }> {
    const lockKey = `senlerGroups:${senlerGroupId}:locks:createLead:${senlerLeadId}`;
    const lockTtl = timeToSeconds({ seconds: 10 });

    let lockAcquired = await this.redis.acquireLock(lockKey, lockTtl);
    while (!lockAcquired) {
      await new Promise(resolve => setTimeout(resolve, 100));
      lockAcquired = await this.redis.acquireLock(lockKey, lockTtl);
    }

    try {
      let lead = await this.prisma.lead.findUnique({
        where: { senlerLeadId },
        include: { senlerGroup: { include: { amoCrmProfile: true } } },
      });

      if (lead) {
        const contactId = await this.getContactForLead({ name }, lead.amoCrmContactId, amoCrmDomainName, tokens);

        const actualAmoCrmLead = await this.amoCrmService.createLeadIfNotExists({
          amoCrmDomainName,
          amoCrmLeadId: lead.amoCrmLeadId,
          tokens,
          name,
          price,
          statusId,
          contactId,
          pipelineId,
          responsibleUserId,
        });

        this.logger.info('Обновление данных сделки и контакта', { contactId, lead, actualAmoCrmLead });
        // TODO: Исправить при необходимости
        // Текущая реализация не проверяет что контакт привязан к сделке
        // т.е если пользователь разорвет связь между контактом и сделкой то мы ее не восстановим

        this.logger.info('Лид был проверен и создан(если требовалось)', labels);

        if (lead.amoCrmLeadId != actualAmoCrmLead.id || contactId != lead.amoCrmContactId) {
          lead = await this.prisma.lead.update({
            where: { amoCrmLeadId: lead.amoCrmLeadId, senlerLeadId },
            include: { senlerGroup: { include: { amoCrmProfile: true } } },
            data: { amoCrmLeadId: actualAmoCrmLead.id, amoCrmContactId: contactId },
          });
        }
        return { lead, amoCrmLead: actualAmoCrmLead };
      }

      let newLeadPayload: CreateLeadDto = { name };
      let newLeadContactId = null;

      if (createContact) {
        newLeadContactId = (await this.amoCrmService.createContact({ name }, amoCrmDomainName, tokens)).id;
        newLeadPayload = { ...newLeadPayload, _embedded: { contacts: [{ id: newLeadContactId }] } };
      }

      const newAmoCrmLead = await this.amoCrmService.createLead({
        amoCrmDomainName,
        leads: [newLeadPayload],
        tokens,
      });
      this.logger.info('Создан лид, причина: нету лида с таким senlerLeadId в базе', {
        labels: { senlerLeadId, newAmoCrmLead: newAmoCrmLead.id, ...labels },
      });
      const newLead = await this.prisma.lead.create({
        include: { senlerGroup: { include: { amoCrmProfile: true } } },
        data: {
          amoCrmLeadId: newAmoCrmLead.id,
          senlerLeadId: senlerLeadId,
          amoCrmContactId: newLeadContactId,
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

  async getContactForLead(
    contactNames: { name?: string; firstName?: string; lastName?: string },
    existsContactId: number | null,
    amoCrmDomainName: string,
    tokens: AmoCrmTokens
  ) {
    // если контакт уже был создан то проверяем что его не удалили
    if (existsContactId) {
      try {
        const contact = await this.amoCrmService.GetContactById({
          contactId: existsContactId,
          tokens: tokens,
          amoCrmDomainName: amoCrmDomainName,
        });
        return contact.id;
      } catch (error) {
        if (error instanceof AxiosError && (error.response?.status === 404 || error.code === HttpStatus.NO_CONTENT.toString())) {
          // если контакт удален то ниже пробуем найти подходящий или создать новый
          existsContactId = null;
        }
        const type = await this.amoCrmService.getExceptionType(error, amoCrmDomainName, tokens);
        throw new AmoCrmError(type.type, false, type.humanMessage);
      }
    }

    // если у лида нет контакта то создадим новый
    if (!existsContactId) {
      this.logger.info('Создаем контакт');

      const contact = await this.amoCrmService.CreateContactIfNotExists({
        amoCrmDomainName: amoCrmDomainName,
        tokens: tokens,
        ...contactNames,
      });

      return contact.id;
    }
  }

  async getAmoCrmWorkspaceInfo(senlerGroupId: number): Promise<AmoCrmWorkspaceInfoDto> {
    const senlerGroup = await this.prisma.senlerGroup.findUniqueOrThrow({
      where: { senlerGroupId },
      include: { amoCrmProfile: true },
    });

    const tokens: AmoCrmTokens = {
      accessToken: senlerGroup.amoCrmProfile.accessToken,
      refreshToken: senlerGroup.amoCrmProfile.refreshToken,
    };

    try {
      const [fields, pipelines, users] = await Promise.all([
        this.amoCrmService.getLeadFields({
          amoCrmDomainName: senlerGroup.amoCrmProfile.domainName,
          tokens,
        }),
        this.amoCrmService.getPipelinesWithStatuses({
          amoCrmDomainName: senlerGroup.amoCrmProfile.domainName,
          tokens,
        }),
        this.amoCrmService.getUsers({
          amoCrmDomainName: senlerGroup.amoCrmProfile.domainName,
          tokens,
        }),
      ]);
      return { fields, pipelines, users };
    } catch (error) {
      if (error instanceof AxiosError) {
        this.logger.error('Ошибка получения сведений от AmoCrm', {
          error: {
            senlerGroupId,
            code: error.status,
            message: error.status === 402 ? 'Проверьте оплату тарифа в аккаунте' : 'Отсутствует подробная информация',
          },
        });
        throw new HttpException(
          {
            message: error.status === 402 ? 'Проверьте оплату тарифа в аккаунте' : 'Отсутствует подробная информация',
            errorCode: error.status,
          },
          HttpStatus.BAD_REQUEST
        );
      }
      this.logger.error('Ошибка получения сведений от AmoCrm', { error: convertExceptionToString(error) });
      throw error;
    }
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
    const mx = this.config.TRANSFER_MESSAGE_MAX_RETRY_DELAY;

    const delay = 1.5 ** retryCount * (1 + Math.random()) * base;

    return Math.min(delay, mx);
  }

  public checkMessageExpired(message: TransferMessage): boolean {
    return Date.now() - new Date(message.metadata.createdAt).getTime() > this.config.TRANSFER_MESSAGE_MAX_RETRY_DELAY;
  }

  // public buildCancelledAmoCrmCacheKey = (accessToken: string) => this.CACHE_CANCELLED_TRANSFER_MESSAGES_PREFIX + accessToken;
  public buildDelayedAmoCrmCacheKey = (accessToken: string) => this.CACHE_DELAYED_TRANSFER_MESSAGES_PREFIX + accessToken;
  public buildSenlerGroupErrorMessagesCacheKey = (senlerGroupId: number) => `senlerGroups:${senlerGroupId}:errors`;
  public withSenlerVarsFormatting(body: BotStepWebhookDto): BotStepWebhookDto {
    const s = body.publicBotStepSettings.amoCrmTransferringSettings;

    if (!s.name) {
      body.publicBotStepSettings.amoCrmTransferringSettings.name = `${body.lead.name} ${body.lead.surname}`.trim();
    } else {
      body.publicBotStepSettings.amoCrmTransferringSettings.name = this.senlerService.formatWithSenlerVars(s.name, body);
    }

    if (s.price) {
      body.publicBotStepSettings.amoCrmTransferringSettings.price = this.senlerService.formatWithSenlerVars(s.price, body);
    }
    return body;
  }

  public async getStat(): Promise<any> {
    let groups = await this.prisma.senlerGroup.findMany({ select: { senlerGroupId: true, _count: { select: { leads: true } } } });
    groups = groups.sort((a, b) => -(a._count.leads - b._count.leads));

    let res = '';

    for (const group of groups) {
      res = res.concat(`Айди группы: ${group.senlerGroupId}, лидов: ${group._count.leads}\n`);
    }

    return res;
  }
}
