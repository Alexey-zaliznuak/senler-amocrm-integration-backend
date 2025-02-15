import { Module } from '@nestjs/common';
import { AmoCrmModule } from 'src/external/amo-crm';
import { SenlerModule } from 'src/external/senler/senler.module';
import { LoggingModule } from 'src/infrastructure/logging/logging.module';
import { INTEGRATION } from './integration.config';
import { IntegrationController } from './integration.controller';
import { IntegrationService } from './integration.service';

@Module({
  imports: [LoggingModule.forFeature(INTEGRATION), AmoCrmModule, SenlerModule],
  controllers: [IntegrationController],
  providers: [IntegrationService],
})
export class IntegrationModule {}
