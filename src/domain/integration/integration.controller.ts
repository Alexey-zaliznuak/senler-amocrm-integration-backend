import { Body, Controller, Get, HttpCode, Post, Query, UseGuards } from '@nestjs/common';
import { Ctx, EventPattern, Payload, RmqContext } from '@nestjs/microservices';
import { ApiBody } from '@nestjs/swagger';
import { IntegrationService } from 'src/domain/integration/integration.service';
import { IntegrationSecretGuard } from 'src/infrastructure/auth/integration-secret.guard';
import { AppConfig } from 'src/infrastructure/config/config.app-config';
import { BotStepWebhookDto, GetSenlerGroupFieldsDto, TransferMessage } from './integration.dto';

@Controller('integration')
export class IntegrationController {
  constructor(private readonly integrationService: IntegrationService) {}

  @Post('/botStepWebhook')
  @HttpCode(200)
  @UseGuards(IntegrationSecretGuard)
  @ApiBody({ type: BotStepWebhookDto })
  async botStepWebhook(@Body() body: any): Promise<any> {
    return await this.integrationService.processBotStepWebhook(body);
  }

  @EventPattern({ cmd: AppConfig.RABBITMQ_TRANSFER_EXCHANGE, routingKey: AppConfig.RABBITMQ_TRANSFER_ROUTING_KEY })
  async handleTransferMessage(@Payload() message: TransferMessage, @Ctx() context: RmqContext) {
    const channel = context.getChannelRef();
    const originalMessage = context.getMessage();

    await this.integrationService.processTransferMessage(message, channel, originalMessage);
  }

  @Get('/getAmoFields')
  @HttpCode(200)
  async getAmoFields(@Query() query: GetSenlerGroupFieldsDto): Promise<any> {
    return await this.integrationService.getAmoCrmFields(query);
  }
}
