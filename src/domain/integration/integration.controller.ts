import {
  Body,
  Controller,
  HttpCode,
  Inject,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { IntegrationService } from './integration.service';
import { CustomRequest } from 'src/infrastructure/requests';
import { AmoCrmService } from 'src/external/amo-crm';
import { ApiProperty } from '@nestjs/swagger';
import { CONFIG } from 'src/infrastructure/config/config.module';
import { AppConfigType } from 'src/infrastructure/config/config.app-config';
import { IntegrationSecretGuard } from 'src/infrastructure/auth/integration-secret.guard';


class TestDto {
  @ApiProperty()
  a?: number;

  @ApiProperty()
  integrationSecret: string;
}


@Controller('integration')
export class IntegrationController {
  constructor(
    @Inject(CONFIG) private readonly config: AppConfigType,
    private readonly amoCrmService: AmoCrmService,
  ) {}

  @Post('/botStepWebhook')
  @HttpCode(201)
  @UseGuards(IntegrationSecretGuard)
  async handlePostRequest(
    @Request() req: CustomRequest,
    @Body() body?: TestDto,
  ): Promise<any> {
    req.logger.warn('HEADERS', req.headers);
    return {
      vars: [{ n: 'x-time', v: new Date().getMilliseconds() }],
    };
  }

  @Post('/kek')
  @HttpCode(201)
  async testing(
    @Request() req: CustomRequest,
    @Body() body: TestDto,
  ): Promise<any> {
    req.logger.info('Привет');

    this.amoCrmService.addUnsorted({
      amoCrmDomain: 'collabox.amocrm.ru',
      source_name: 'Senler',
      source_uid: '8c46bc3e-2a49-41a7-9083-800bdf8e8a78',
      metadata: {
        form_id: '1',
        form_name: 'name',
      },
      pipeline_id: '',
      contactName: 'contactName',
    });
    return this.config.INSTANCE_ID;
  }
  // ---------------------------- Удалить после теста --------------------------------

  @Post('/kek2')
  @HttpCode(201)
  async testing2(
    @Request() req: CustomRequest,
    @Body() body: TestDto,
  ): Promise<any> {
    req.logger.info('Д');
    this.amoCrmService.addContact({
      amoCrmDomain: 'collabox.amocrm.ru',
      name: 'Максим Senler',
      first_name: 'Максим',
      last_name: 'Санич',
    });
    return this.config.INSTANCE_ID;
  }

  @Post('/kek3')
  @HttpCode(201)
  async testing3(
    @Request() req: CustomRequest,
    @Body() body: TestDto,
  ): Promise<any> {
    req.logger.info('создание контакта');
    this.amoCrmService.addLead({
      amoCrmDomain: 'collabox.amocrm.ru',
      leads: [
        {
          name: 'Senler',
          price: 10,
        },
      ],
    });
    return this.config.INSTANCE_ID;
  }

  @Post('/kek4')
  @HttpCode(201)
  async testing4(
    @Request() req: CustomRequest,
    @Body() body: TestDto,
  ): Promise<any> {
    req.logger.info('Создание филдов в лиде');
    this.amoCrmService.createLeadField({
      amoCrmDomain: 'collabox.amocrm.ru',
      fields: [
        {
          type: 'text',
          name: 'Имя до переменной',
        },
      ],
    });
    return this.config.INSTANCE_ID;
  }
}
