import { Body, Controller, HttpCode, Param, Post, Request } from '@nestjs/common';
import { WebhooksService } from './webhooks.service';
import { CustomRequest } from 'src/infrastructure/requests';
import { AmoCrmService } from 'src/external/amo-crm';

@Controller('integration/webhooks')
export class WebhooksController {
  constructor(
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
    @Body() body?: {name: string},
  ): Promise<any> {
    req.logger.info("Привет")
    // this.amoCrmService.acceptUnsorted(...)
    return {
      1: 2
    }
  }
}
