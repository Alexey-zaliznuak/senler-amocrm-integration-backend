import { Body, Controller, HttpCode, Param, Post, Request } from '@nestjs/common';
import { WebhooksService } from './webhooks.service';
import { CustomRequest } from 'src/infrastructure/requests';

@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @Post('bot_step')
  @HttpCode(200)
  async handlePostRequest(
    @Request() req: CustomRequest,
    @Param('url') url?: string,
    @Body() body?: any,
  ): Promise<any> {
    // req.logger.info("New request recieved", { body })

    return {}
  }
}
