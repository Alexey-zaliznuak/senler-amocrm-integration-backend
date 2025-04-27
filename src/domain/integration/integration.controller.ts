import { Body, Controller, Get, HttpCode, Inject, Post, Query, Request, UseGuards } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { ApiBody } from '@nestjs/swagger';
import { validate } from 'class-validator';
import { IntegrationService } from 'src/domain/integration/integration.service';
import { IntegrationSecretGuard } from 'src/infrastructure/auth/integration-secret.guard';
import { NatsService } from 'src/infrastructure/nats/nats.service';
import { CustomRequest } from 'src/infrastructure/requests';
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
  async botStepWebhook(@Body() body: typeof BotStepWebhookDto): Promise<any> {
    try {
      const validationErrors = await validate(Object.assign(new BotStepWebhookDto()), body);

      if (validationErrors) {
        return {
          error: "Validation failed",
          message: validationErrors.map(v => v.toString()).join('\n')};
      }

      await this.nats.publishMessage('integration.syncVars', body);

      return { success: true };
    } catch (error) {
      this.logger.error('Push bot step webhook failed', { error });
      return { error: 'internal', message: 'Внутренняя ошибка сервиса' };
    }
  }

  @MessagePattern('integration.syncVars')
  async handleSyncVariablesMessage(@Payload() payload: BotStepWebhookDto) {
    await this.integrationService.processBotStepWebhook(payload);
  }

  @Get('/getAmoFields')
  @HttpCode(200)
  async getAmoFields(@Query() query: GetSenlerGroupFieldsDto): Promise<any> {
    return await this.integrationService.getAmoCrmFields(query);
  }
}
