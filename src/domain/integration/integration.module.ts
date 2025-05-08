import { Module } from '@nestjs/common';
import { AmoCrmModule } from 'src/external/amo-crm';
import { LoggingModule } from 'src/infrastructure/logging/logging.module';
import { LOGGER_INJECTABLE_NAME } from './integration.config';
import { IntegrationController } from './integration.controller';
import { IntegrationService } from './integration.service';
import { SenlerModule } from 'src/external/senler/senler.module';
import { RabbitmqModule } from 'src/infrastructure/rabbitMq/rabbitMq.module';

@Module({
  imports: [LoggingModule.forFeature(LOGGER_INJECTABLE_NAME), AmoCrmModule, SenlerModule, RabbitmqModule],
  controllers: [IntegrationController],
  providers: [IntegrationService],
})
export class IntegrationModule {}
