import { Module } from '@nestjs/common';
import { IntegrationService } from './integration.service';
import { IntegrationController } from './integration.controller';
import { AmoCrmService } from 'src/external/amo-crm';

@Module({
  controllers: [IntegrationController],
  providers: [IntegrationService, AmoCrmService],
})
export class IntegrationModule {}
