import { Body, Controller, Get, HttpCode, Inject, Post, Query, Request, UnauthorizedException, UseGuards } from '@nestjs/common';
import { ApiBody, ApiProperty } from '@nestjs/swagger';
import { IntegrationService } from 'src/domain/integration/integration.service';
import { AmoCrmService } from 'src/external/amo-crm';
import { IntegrationSecretGuard } from 'src/infrastructure/auth/integration-secret.guard';
import { AppConfigType } from 'src/infrastructure/config/config.app-config';
import { CONFIG } from 'src/infrastructure/config/config.module';
import { CustomRequest } from 'src/infrastructure/requests';
import { BotStepWebhookDto, GetSenlerGroupFieldsDto } from './integration.dto';

class TestDto {
  @ApiProperty({ description: 'lead id' })
  leadId: number;

  @ApiProperty({ description: 'amoCrmAccessToken' })
  amoCrmAccessToken: string;

  @ApiProperty({ description: 'amoCrmDomainName' })
  amoCrmDomainName: string;
}

@Controller('integration')
export class IntegrationController {
  constructor(
    @Inject(CONFIG) private readonly config: AppConfigType,
    private readonly integrationService: IntegrationService,
    private readonly amoCrmService: AmoCrmService
  ) {}

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
  async getAmoFields(@Request() req: CustomRequest, @Query() query: GetSenlerGroupFieldsDto): Promise<any> {
    req.logger.debug('getAmoFields body', query);

    return await this.integrationService.getAmoCRMFields(req, query);
  }

  @Post('/drop')
  @HttpCode(201)
  @ApiBody({ type: TestDto })
  async drop(): Promise<any> {
    throw new UnauthorizedException('test');
  }

  @Post('/test')
  @HttpCode(201)
  @ApiBody({ type: TestDto })
  async test(@Request() req: CustomRequest, @Body() body: any): Promise<any> {
    req.logger.error('BODY', body);
    return await this.amoCrmService.getLeadById(body);
  }
}
