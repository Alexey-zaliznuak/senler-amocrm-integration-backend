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
import { IsNotEmpty, IsString } from 'class-validator';

class TestSetToken {
  @ApiProperty({ description: 'auth code' })
  @IsNotEmpty()
  @IsString()
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

    // def50200d5e7939469ad788d44ea2e4ffb329f77351cb532d1183a4eeadeb9c0615547aef14fedc1ceee9dfd8800735e12938bf2f9f6b35b5d44b489d245be747b8554b5dfebe720d14b983f3edebb1fd8a7728dbd0bcbc73b34c65fa00ffeff2e6e917f16926830e1916bae8703e391c14a558d8521145635d37c50269b9498f49e73e483bcb0348817aa545b869ab5a7e834487ab2bb59cb5e1c6e6f83efcf9acfbe447961b64b0482f419ec9554d864106661fc0e17f473bda6d0c7e11785e2f7ceab65e37a908bc75b329a2186b269b3c73d8d711fdb38bb880db00a45ded6d18d354d4a32f07b75f267d96abd8f2008e705095943058f4e462535adc344e01da4c0bd118df666b049ee1ededba00e1924df590ef7e2c2d4e3e922b263995b7708e118ebbae90988a79c0d78c86e4536ca9fbabf64ba6efdbf058e96d7916ba5fd70880e60968950485f517474c99b782e1f841a2e4349495a7b8ba1921c1189cbccf88332fd0f6cee29760a49d9a82632bc62ab6e563ff657c80653bc4cbf1cd36a744b4958bb69c156f8ec60e572780849b92ec3405bd1745bbcc1c3649122c5ea599fa85c743ff9278cfb82f1a941fcc5d82ebb538bc43624bf69764296bc25b0ee5eae78c117ca38cbc226b04660e8e35c1627d01457e0c5e4e524a0e90d95565f7647661ec60b277d956f427ed6

    req.logger.info("TOKENS-0", {
      amoCrmAccessToken: group.amoCrmAccessToken,
      amoCrmRefreshToken: group.amoCrmRefreshToken
    })

    return await refreshAccessToken({
      amoCrmDomain: group.amoCrmDomainName,
      tokens: {
        amoCrmAccessToken: group.amoCrmAccessToken,
        amoCrmRefreshToken: group.amoCrmRefreshToken
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

  const new_group = await prisma.senlerGroup.findUniqueOrThrow({where: {senlerGroupId: "953340"}})

  return new_group
  }
}
