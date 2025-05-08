import { Body, Controller, Get, HttpCode, Inject, Post, Query, UseGuards } from '@nestjs/common';
import { Ctx, EventPattern, Payload, RmqContext } from '@nestjs/microservices';
import { ApiBody } from '@nestjs/swagger';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { IntegrationService } from 'src/domain/integration/integration.service';
import { IntegrationSecretGuard } from 'src/infrastructure/auth/integration-secret.guard';
import { AppConfig, AppConfigType } from 'src/infrastructure/config/config.app-config';
import { CONFIG } from 'src/infrastructure/config/config.module';
import { RabbitMqService } from 'src/infrastructure/rabbitMq/rabbitMq.service';
import { convertExceptionToString } from 'src/utils';
import { Logger } from 'winston';
import { LOGGER_INJECTABLE_NAME } from './integration.config';
import { BotStepWebhookDto, GetSenlerGroupFieldsDto, TransferMessage } from './integration.dto';

@Controller('integration')
export class IntegrationController {
  constructor(
    private readonly integrationService: IntegrationService,
    private readonly rabbitMq: RabbitMqService,
    @Inject(LOGGER_INJECTABLE_NAME) private readonly logger: Logger,
    @Inject(CONFIG) private readonly appConfig: AppConfigType
  ) {}

  @Post('/botStepWebhook')
  @HttpCode(200)
  @UseGuards(IntegrationSecretGuard)
  @ApiBody({ type: BotStepWebhookDto })
  async botStepWebhook(@Body() body: any): Promise<any> {
    const message: TransferMessage = { payload: body, metadata: { retryNumber: 0, createdAt: new Date().toISOString() } };

    this.logger.info('Получен запрос()', {
      labels: this.integrationService.extractLoggingLabelsFromRequest(message.payload),
      requestTitle: `Запрос от ${message.metadata.createdAt} (UTC)`,
      message,
      status: 'VALIDATING',
    });

    try {
      const validationErrors = await validate(plainToInstance(BotStepWebhookDto, message.payload ?? {}));

      if (validationErrors.length) {
        const details = validationErrors.map(v => v.toString()).join('\n');

        this.logger.error('Ошибка валидации запроса', {
          labels: this.integrationService.extractLoggingLabelsFromRequest(message.payload),
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
        labels: this.integrationService.extractLoggingLabelsFromRequest(message.payload),
        requestTitle: this.integrationService.buildProcessWebhookTitle(message.payload),
        status: 'PENDING',
      });

      return { success: true };
    } catch (error) {
      const details = convertExceptionToString(error);

      this.logger.error('Ошибка запроса', {
        labels: this.integrationService.extractLoggingLabelsFromRequest(message.payload),
        details,
        status: 'FAILED',
      });

      return { error: 'internal', message: details };
    }
  }

  @EventPattern({ cmd: AppConfig.RABBITMQ_TRANSFER_EXCHANGE, routingKey: AppConfig.RABBITMQ_TRANSFER_ROUTING_KEY })
  async handleSyncVariablesMessage(@Payload() message: TransferMessage, @Ctx() context: RmqContext) {
    const channel = context.getChannelRef();
    const originalMessage = context.getMessage();

    await this.integrationService.processBotStepWebhook(message, channel, originalMessage);
  }

  @Get('/getAmoFields')
  @HttpCode(200)
  async getAmoFields(@Query() query: GetSenlerGroupFieldsDto): Promise<any> {
    return await this.integrationService.getAmoCrmFields(query);
  }
}
