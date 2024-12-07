import { Module } from '@nestjs/common';
import { WebhooksService } from './webhooks.service';
import { WebhooksController } from './webhooks.controller';
import { AmoCrmModule } from 'src/external/amo-crm';

@Module({
  controllers: [WebhooksController],
  providers: [WebhooksService],
  imports: [AmoCrmModule],
})
export class WebhooksModule {}
