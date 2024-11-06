import { Controller, Post, Body, Param, Request, Get } from '@nestjs/common';
import { IntegrationService } from './integration.service';
import { CustomRequest } from 'src/infrastructure/requests';

@Controller('integration')
export class IntegrationController {
  constructor(
    private readonly integrationService: IntegrationService,
  ) {}

  @Post(':url')
  @Get(':url')
  async handlePostRequest(
    @Param('url') url: string,
    @Request() req: CustomRequest,
    @Body() body?: any,
  ): Promise<any> {
    req.logger.info("New request recieved", { body })
  }
}
