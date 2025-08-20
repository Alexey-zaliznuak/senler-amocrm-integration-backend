import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Inject, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBody } from '@nestjs/swagger';
import * as amqp from 'amqplib';
import { IntegrationService } from 'src/domain/integration/integration.service';
import { IntegrationSecretGuard } from 'src/infrastructure/auth/integration-secret.guard';
import { AppConfig, AppConfigType } from 'src/infrastructure/config/config.app-config';
import { CONFIG } from 'src/infrastructure/config/config.module';
import { AmqpSerializedMessage } from 'src/infrastructure/rabbitmq/events/amqp.service';
import { AmqpEventPattern } from 'src/infrastructure/rabbitmq/events/decorator';
import {
  BotStepWebhookDto,
  GetSenlerGroupFieldsRequestDto,
  TransferMessage,
  UnlinkAmoCrmAccountRequestDto,
} from './integration.dto';

@Controller('integration')
export class IntegrationController {
  constructor(
    @Inject(CONFIG) private readonly config: AppConfigType,
    private readonly integrationService: IntegrationService
  ) {}

  @Post('/botStepWebhook')
  @HttpCode(HttpStatus.OK)
  @UseGuards(IntegrationSecretGuard)
  @ApiBody({ type: BotStepWebhookDto })
  async botStepWebhook(@Body() body: any): Promise<any> {
    return await this.integrationService.processBotStepWebhook(body);
  }

  @Get('/config')
  conf(): any {
    return {
      1: 2,
      3: this.integrationService.config.DATABASE_URL,
      4: AppConfig,
    };
  }

  @Delete('/untieAmoCrmProfile')
  @HttpCode(HttpStatus.NO_CONTENT)
  async unlinkAmoAccount(@Query() query: UnlinkAmoCrmAccountRequestDto): Promise<any> {
    return await this.integrationService.unlinkAmoAccount(query.senlerGroupId);
  }

  @AmqpEventPattern(AppConfig.RABBITMQ_TRANSFER_QUEUE)
  async handleTransferMessage(msg: AmqpSerializedMessage<TransferMessage>, channel: amqp.Channel) {
    await this.integrationService.processTransferMessage(msg.content, channel, msg);
  }

  @Get('/getAmoFields')
  @HttpCode(HttpStatus.OK)
  async getAmoFields(@Query() query: GetSenlerGroupFieldsRequestDto): Promise<any> {
    return await this.integrationService.getAmoCrmFields(query.senlerGroupId);
  }
}
