import { Body, Controller, HttpCode, Inject, Param, Post, Request } from '@nestjs/common';
import { WebhooksService } from './webhooks.service';
import { CustomRequest } from 'src/infrastructure/requests';
import { AmoCrmService } from 'src/external/amo-crm';
import { ApiHeader, ApiProperty } from '@nestjs/swagger';
import { CONFIG } from 'src/infrastructure/config/config.module';
import { AppConfigType } from 'src/infrastructure/config/config.app-config';

class TestDto {
  @ApiProperty()
  a: number
}


@Controller('integration/webhooks')
export class WebhooksController {
  constructor(
    @Inject(CONFIG) private readonly config: AppConfigType,
    private readonly webhooksService: WebhooksService,
    private readonly amoCrmService: AmoCrmService,
  ) {}

  @Post('/bot_step')
  @HttpCode(201)
  async handlePostRequest(
    @Request() req: CustomRequest,
    @Body() body?: any,
  ): Promise<any> {
    req.logger.warn("HEADERS", req.headers)
    return {
      vars: [
        { n:"x-time", v: new Date().getMilliseconds() }
      ]
    }
  }

  @Post('/kek')
  @HttpCode(201)
  async testing(
    @Request() req: CustomRequest,
    @Body() body: TestDto,
  ): Promise<any> {
    req.logger.info("Привет")
    return this.config.INSTANCE_ID
  }
}
