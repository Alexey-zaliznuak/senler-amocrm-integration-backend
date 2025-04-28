import { Body, Controller, Get, HttpCode, Inject, Post, Query, UseGuards } from '@nestjs/common';
import { Ctx, EventPattern, NatsContext, Payload } from '@nestjs/microservices';
import { ApiBody } from '@nestjs/swagger';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { IntegrationService } from 'src/domain/integration/integration.service';
import { IntegrationSecretGuard } from 'src/infrastructure/auth/integration-secret.guard';
import { NatsService } from 'src/infrastructure/nats/nats.service';
import { convertExceptionToString } from 'src/utils';
import { Logger } from 'winston';
import { LOGGER_INJECTABLE_NAME } from './integration.config';
import { BotStepWebhookDto, GetSenlerGroupFieldsDto } from './integration.dto';

@Controller('integration')
export class IntegrationController {
  constructor(
    private readonly integrationService: IntegrationService,
    private readonly nats: NatsService,
    @Inject(LOGGER_INJECTABLE_NAME) private readonly logger: Logger
  ) {}

  @Post('/botStepWebhook')
  @HttpCode(200)
  @UseGuards(IntegrationSecretGuard)
  @ApiBody({ type: BotStepWebhookDto })
  // not use body annotation for validation in controller
  async botStepWebhook(@Body() body: any): Promise<any> {
    this.logger.info('Получен запрос', {
      labels: this.integrationService.extractLoggingLabelsFromRequest(body),
      requestTile: `Запрос от ${new Date().toLocaleString('UTC')} (UTC)`,
      body,
      status: 'VALIDATING',
    });

    try {
      const validationErrors = await validate(plainToInstance(BotStepWebhookDto, body ?? {}));

      if (validationErrors.length) {
        const details = validationErrors.map(v => v.toString()).join('\n');

        this.logger.error('Ошибка валидации запроса', {
          labels: this.integrationService.extractLoggingLabelsFromRequest(body),
          details,
          status: 'FAILED',
        });

        return {
          error: 'Validation failed',
          message: details,
        };
      }

      await this.nats.publishMessage('integration.syncVars', body);

      this.logger.info('Запрос принят в обработку', {
        labels: this.integrationService.extractLoggingLabelsFromRequest(body),
        requestTitle: this.integrationService.buildProcessWebhookTitle(body),
        status: 'PENDING',
      });

      return { success: true };
    } catch (error) {
      const details = convertExceptionToString(error);

      this.logger.error('Ошибка запроса', {
        labels: this.integrationService.extractLoggingLabelsFromRequest(body),
        details,
        status: 'FAILED',
      });

      return { error: 'internal', message: details };
    }
  }

  @EventPattern('integration.syncVars')
  async handleSyncVariablesMessage(@Payload() payload: BotStepWebhookDto, @Ctx() context: NatsContext) {
    await this.integrationService.processBotStepWebhook(payload);
  }

  @Get('/getAmoFields')
  @HttpCode(200)
  async getAmoFields(@Query() query: GetSenlerGroupFieldsDto): Promise<any> {
    return await this.integrationService.getAmoCrmFields(query);
  }
}
