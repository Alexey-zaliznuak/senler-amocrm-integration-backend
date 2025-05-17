import { Body, Controller, Get, HttpCode, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBody } from '@nestjs/swagger';
import * as amqp from 'amqplib';
import { IntegrationService } from 'src/domain/integration/integration.service';
import { IntegrationSecretGuard } from 'src/infrastructure/auth/integration-secret.guard';
import { AppConfig } from 'src/infrastructure/config/config.app-config';
import { AmqpSerializedMessage } from 'src/infrastructure/rabbitmq/events/amqp.service';
import { AmqpEventPattern } from 'src/infrastructure/rabbitmq/events/decorator';
import { RedisService } from 'src/infrastructure/redis/redis.service';
import { BotStepWebhookDto, GetSenlerGroupFieldsDto, TransferMessage } from './integration.dto';

@Controller('integration')
export class IntegrationController {
  constructor(
    private readonly integrationService: IntegrationService,
  ) {}

  @Post('/botStepWebhook')
  @HttpCode(200)
  @UseGuards(IntegrationSecretGuard)
  @ApiBody({ type: BotStepWebhookDto })
  async botStepWebhook(@Body() body: any): Promise<any> {
    return AppConfig.TRANSFER_MESSAGE_BASE_RETRY_DELAY;
  }

  @AmqpEventPattern(AppConfig.RABBITMQ_TRANSFER_QUEUE)
  async handleTransferMessage(msg: AmqpSerializedMessage<TransferMessage>, channel: amqp.Channel) {
    await this.integrationService.processTransferMessage(msg.content, channel, msg);
  }

  @Get('/getAmoFields')
  @HttpCode(200)
  async getAmoFields(@Query() query: GetSenlerGroupFieldsDto): Promise<any> {
    return await this.integrationService.getAmoCrmFields(query);
  }
}
