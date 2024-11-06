import { Controller, Post, Body, Param, Request, Get, HttpCode } from '@nestjs/common';
import { IntegrationService } from './integration.service';
import { CustomRequest } from 'src/infrastructure/requests';

@Controller('integration')
export class IntegrationController {
  constructor(
    private readonly integrationService: IntegrationService,
  ) {}

  @Post(':url')
  // @Get(':url')
  @HttpCode(201)
  async handlePostRequest(
    @Request() req: CustomRequest,
    @Param('url') url?: string,
    @Body() body?: any,
  ): Promise<any> {
    req.logger.info("New request recieved", { body })

    return {ok : 1}
  }
}
