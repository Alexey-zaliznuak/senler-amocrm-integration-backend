import { Body, Controller, Post } from '@nestjs/common';
import { IntegrationService } from './integration.service';

@Controller('integration')
export class IntegrationController {
  constructor(private readonly integrationService: IntegrationService) {}

  @Post("webhooks/sendDataToAmo")
  handleWebhook(@Body() body: any): string {
    return 'success';
  }
}
