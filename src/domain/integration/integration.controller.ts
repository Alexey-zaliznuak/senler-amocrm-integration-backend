import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBody } from '@nestjs/swagger';
import * as amqp from 'amqplib';
import { IntegrationService } from 'src/domain/integration/integration.service';
import { IntegrationSecretGuard } from 'src/infrastructure/auth/integration-secret.guard';
import { AppConfig } from 'src/infrastructure/config/config.app-config';
import { AmqpSerializedMessage } from 'src/infrastructure/rabbitmq/events/amqp.service';
import { AmqpEventPattern } from 'src/infrastructure/rabbitmq/events/decorator';
import {
  BotStepWebhookDto,
  ChangeAmoCrmAccountRequestDto,
  GetSenlerGroupFieldsRequestDto,
  TransferMessage,
} from './integration.dto';

@Controller('integration')
export class IntegrationController {
  constructor(private readonly integrationService: IntegrationService) {}

  @Post('/botStepWebhook')
  @HttpCode(HttpStatus.OK)
  @UseGuards(IntegrationSecretGuard)
  @ApiBody({ type: BotStepWebhookDto })
  async botStepWebhook(@Body() body: any): Promise<any> {
    return await this.integrationService.processBotStepWebhook(body);
  }

  @Delete('/change-amocrm-account')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBody({ type: ChangeAmoCrmAccountRequestDto })
  async changeAmoCrmAccount(@Body() body: ChangeAmoCrmAccountRequestDto) {
    await this.integrationService.changeAmoCrmAccount(body);
  }

  @AmqpEventPattern(AppConfig.RABBITMQ_TRANSFER_QUEUE)
  async handleTransferMessage(msg: AmqpSerializedMessage<TransferMessage>, channel: amqp.Channel) {
    await this.integrationService.processTransferMessage(msg.content, channel, msg);
  }

  @Get('getAmoFields')
  @HttpCode(HttpStatus.OK)
  async getAmoFields(@Query() query: GetSenlerGroupFieldsRequestDto): Promise<any> {
    return await this.integrationService.getAmoCrmFields(query.senlerGroupId);
  }

  @Get('AmoCrmErrors')
  @HttpCode(HttpStatus.OK)
  async getAmoCrmErrors(@Query() query: GetSenlerGroupFieldsRequestDto): Promise<string> {
    return await this.integrationService.getSenlerGroupErrorMessage(query.senlerGroupId);
  }

  @Delete('AmoCrmErrors')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteAmoCrmErrors(@Query() query: GetSenlerGroupFieldsRequestDto): Promise<void> {
    await this.integrationService.deleteSenlerGroupErrorMessages(query.senlerGroupId);
  }
}
