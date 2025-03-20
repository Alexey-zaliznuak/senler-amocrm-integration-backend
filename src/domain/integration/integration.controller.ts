import { Body, Controller, Get, HttpCode, Post, Query, Request, UseGuards } from '@nestjs/common';
import { ApiBody } from '@nestjs/swagger';
import { IntegrationService } from 'src/domain/integration/integration.service';
import { IntegrationSecretGuard } from 'src/infrastructure/auth/integration-secret.guard';
import { CustomRequest } from 'src/infrastructure/requests';
import { BotStepWebhookDto, GetSenlerGroupFieldsDto } from './integration.dto';

@Controller('integration')
export class IntegrationController {
  constructor(private readonly integrationService: IntegrationService) {}

  @Post('/botStepWebhook')
  @HttpCode(200)
  @UseGuards(IntegrationSecretGuard)
  @ApiBody({ type: BotStepWebhookDto })
  async botStepWebhook(@Request() req: CustomRequest, @Body() body: BotStepWebhookDto): Promise<any> {
    return await this.integrationService.processBotStepWebhook(req, body);
  }

  @Get('/getAmoFields')
  @HttpCode(200)
  @ApiBody({ type: GetSenlerGroupFieldsDto })
  async getAmoFields(@Query() query: GetSenlerGroupFieldsDto): Promise<any> {
    return await this.integrationService.getAmoCrmFields(query);
  }
}
