import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBody, ApiResponse } from '@nestjs/swagger';
import * as amqp from 'amqplib';
import { IntegrationService } from 'src/domain/integration/integration.service';
import { IntegrationSecretGuard } from 'src/infrastructure/auth/integration-secret.guard';
import { AppConfig } from 'src/infrastructure/config/config.app-config';
import { AmqpSerializedMessage } from 'src/infrastructure/rabbitmq/events/amqp.service';
import { AmqpEventPattern } from 'src/infrastructure/rabbitmq/events/decorator';
import { AmoCrmWorkspaceInfoDto } from './dto/get-workspace-info.dto';
import {
  BotStepWebhookDto,
  ChangeAmoCrmAccountRequestDto,
  SenlerGroupIdQueryDto,
  TransferMessage,
} from './dto/integration.dto';

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

  @Get('amocrm-workspace-info')
  @HttpCode(HttpStatus.OK)
  @ApiResponse({ type: AmoCrmWorkspaceInfoDto })
  async getAmoCrmWorkspaceInfo(@Query() query: SenlerGroupIdQueryDto): Promise<AmoCrmWorkspaceInfoDto> {
    return await this.integrationService.getAmoCrmWorkspaceInfo(query.senlerGroupId);
  }

  @Get('AmoCrmErrors')
  @HttpCode(HttpStatus.OK)
  async getAmoCrmErrors(@Query() query: SenlerGroupIdQueryDto): Promise<string> {
    return await this.integrationService.getSenlerGroupErrorMessage(query.senlerGroupId);
  }

  @Delete('AmoCrmErrors')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteAmoCrmErrors(@Query() query: SenlerGroupIdQueryDto): Promise<void> {
    await this.integrationService.deleteSenlerGroupErrorMessages(query.senlerGroupId);
  }

  // Для отладки/статистики Михаилу
  // @Get('conf')
  // @HttpCode(HttpStatus.OK)
  // public getConf(): any {
  //   return this.integrationService.getConf();
  // }

  // @Get('stat')
  // @HttpCode(HttpStatus.OK)
  // public getStat(): any {
  //   return this.integrationService.getStat();
  // }
}
