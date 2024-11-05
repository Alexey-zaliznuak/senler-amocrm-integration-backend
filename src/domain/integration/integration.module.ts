import { Module } from '@nestjs/common';
import { IntegrationService } from './integration.service';
import { IntegrationController } from './integration.controller';
import { WebhooksModule } from './webhooks/webhooks.module';

@Module({
  controllers: [IntegrationController],
  providers: [IntegrationService],
  imports: [WebhooksModule],
})
export class IntegrationModule {}
