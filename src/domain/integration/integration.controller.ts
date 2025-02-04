import { Body, Controller, Get, HttpCode, Inject, Post, Query, Request, UseGuards } from '@nestjs/common';
import { ApiBody, ApiProperty } from '@nestjs/swagger';
import { IntegrationService } from 'src/domain/integration/integration.service';
import { IntegrationSecretGuard } from 'src/infrastructure/auth/integration-secret.guard';
import { AppConfigType } from 'src/infrastructure/config/config.app-config';
import { CONFIG } from 'src/infrastructure/config/config.module';
import { CustomRequest } from 'src/infrastructure/requests';
import { BotStepWebhookDto, GetSenlerGroupFieldsDto } from './integration.dto';
import { AmoCrmService } from 'src/external/amo-crm';

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
    private readonly amo: AmoCrmService
  ) {}

  @Post('/botStepWebhook')
  @HttpCode(200)
  @UseGuards(IntegrationSecretGuard)
  @ApiBody({ type: BotStepWebhookDto })
  async botStepWebhook(@Request() req: CustomRequest, @Body() body: BotStepWebhookDto): Promise<any> {
    return await this.integrationService.processBotStepWebhook(req, body);
  }

  @Post('/test')
  @HttpCode(201)
  @ApiBody({ type: TestDto })
  async test(@Request() req: CustomRequest, @Body() body: any): Promise<any> {
    req.logger.error('BODY', body);
    return await this.amo.getLeadById(body);
  }

  @Get('/getAmoFields')
  @HttpCode(201)
  @ApiBody({ type: GetSenlerGroupFieldsDto })
  async getAmoFields(@Request() req: CustomRequest, @Query() query: GetSenlerGroupFieldsDto): Promise<any> {
    req.logger.debug('getAmoFields body', query);

    return await this.integrationService.getAmoCRMFields(req, query);
  }

  // @Post('/kek2')
  // @HttpCode(201)
  // async testing2(@Request() req: CustomRequest, @Body() _body: TestDto): Promise<any> {
  //   req.logger.info('Д');
  //   // this.amoCrmService.addContact({
  //   //   amoCrmDomain: 'collabox.amocrm.ru',
  //   //   name: 'Максим Senler',
  //   //   first_name: 'Максим',
  //   //   last_name: 'Санич',
  //   // });
  //   // return this.config.INSTANCE_ID;
  // }

  // @Post('/kek3')
  // @HttpCode(201)
  // async testing3(@Request() req: CustomRequest, @Body() _body: TestDto): Promise<any> {
  //   req.logger.info('создание контакта');
  //   // this.amoCrmService.addLead({
  //   //   amoCrmDomain: 'collabox.amocrm.ru',
  //   //   leads: [
  //   //     {
  //   //       name: 'Senler',
  //   //       price: 10,
  //   //     },
  //   //   ],
  //   // });
  //   // return this.config.INSTANCE_ID;
  // }

  // @Post('/kek4')
  // @HttpCode(201)
  // async testing4(@Request() req: CustomRequest, @Body() _body: TestDto): Promise<any> {
  //   req.logger.info('Создание филдов в лиде');
  //   // this.amoCrmService.createLeadField({
  //   //   amoCrmDomain: 'collabox.amocrm.ru',
  //   //   fields: [
  //   //     {
  //   //       type: 'text',
  //   //       name: 'Имя до переменной',
  //   //     },
  //   //   ],
  //   // });
  //   // return this.config.INSTANCE_ID;
  // }
}
