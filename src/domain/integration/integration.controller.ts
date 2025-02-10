import { Body, Controller, Get, HttpCode, Inject, Post, Query, Request, UnauthorizedException, UseGuards } from '@nestjs/common';
import { ApiBody, ApiProperty } from '@nestjs/swagger';
import { IntegrationService } from 'src/domain/integration/integration.service';
import { AmoCrmService } from 'src/external/amo-crm';
import { IntegrationSecretGuard } from 'src/infrastructure/auth/integration-secret.guard';
import { AppConfigType } from 'src/infrastructure/config/config.app-config';
import { CONFIG } from 'src/infrastructure/config/config.module';
import { CustomRequest } from 'src/infrastructure/requests';
import { BotStepWebhookDto, GetSenlerGroupFieldsDto } from './integration.dto';
import { prisma } from 'src/infrastructure/database';
import { refreshAccessToken } from 'src/external/amo-crm/handlers/expired-token.decorator';

class TestSetToken {
  @ApiProperty({ description: 'auth code' })
  code: string;
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

    return await this.integrationService.getAmoCrmFields(req, query);
  }

  // TESTS
  @Post('/test/checkApiAvailable')
  @HttpCode(201)
  async test(@Request() req: CustomRequest, @Body() body: any): Promise<any> {
    const group = await prisma.senlerGroup.findUniqueOrThrow({where: {senlerGroupId: "953340"}})
    return await this.amoCrmService.getLeadById({
      leadId: "32055027",
      tokens: {
        amoCrmAccessToken: group.amoCrmAccessToken,
        amoCrmRefreshToken: group.senlerAccessToken
      },
      amoCrmDomainName: group.amoCrmDomainName,
    });
  }

  @Post('/test/refreshTokens')
  @HttpCode(201)
  async test_refresh_tokens(@Request() req: CustomRequest, @Body() body: any): Promise<any> {
    const group = await prisma.senlerGroup.findUniqueOrThrow({where: {senlerGroupId: "953340"}})

    await refreshAccessToken({
      amoCrmDomain: group.amoCrmDomainName,
      tokens: {
        amoCrmAccessToken: group.amoCrmAccessToken,
        amoCrmRefreshToken: group.senlerAccessToken
      },
    })
  }

  @Post('/test/setTokens')
  @HttpCode(201)
  @ApiBody({ type: TestSetToken })
  async test_set_tokens(@Request() req: CustomRequest, @Body() body: TestSetToken): Promise<any> {
    const group = await prisma.senlerGroup.findUniqueOrThrow({where: {senlerGroupId: "953340"}})

    const tokens = await this.amoCrmService.getAccessAndRefreshTokens(group.amoCrmDomainName, body.code);

    await prisma.senlerGroup.update({
      where: {amoCrmDomainName: group.amoCrmDomainName},
      data: {
        amoCrmAccessToken: tokens.access_token,
        amoCrmRefreshToken: tokens.refresh_token,
      }
    })
  }
}
