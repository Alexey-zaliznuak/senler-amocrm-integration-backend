import { Module } from '@nestjs/common';
import { AmoCrmModule } from 'src/external/amo-crm';
import { LoggingModule } from 'src/infrastructure/logging/logging.module';
import { INTEGRATION } from './integration.config';
import { IntegrationController } from './integration.controller';
import { IntegrationService } from './integration.service';
import { NatsModule } from 'src/infrastructure/nats/nats.module';
import { SenlerModule } from 'src/external/senler/senler.module';

@Module({
  imports: [LoggingModule.forFeature(INTEGRATION), AmoCrmModule, NatsModule, SenlerModule],
  controllers: [IntegrationController],
  providers: [IntegrationService],
})
export class IntegrationModule {}
