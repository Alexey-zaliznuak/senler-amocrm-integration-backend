import { Module } from '@nestjs/common';
import { AmoCrmModule } from 'src/external/amo-crm';
import { SenlerModule } from 'src/external/senler/senler.module';
import { LoggingModule } from 'src/infrastructure/logging/logging.module';
import { RabbitmqModule } from 'src/infrastructure/rabbitmq/rabbitmq.module';
import { LOGGER_INJECTABLE_NAME } from './integration.config';
import { IntegrationController } from './integration.controller';
import { IntegrationService } from './integration.service';

@Module({
  imports: [LoggingModule.forFeature(LOGGER_INJECTABLE_NAME), AmoCrmModule, SenlerModule, RabbitmqModule],
  controllers: [IntegrationController],
  providers: [IntegrationService],
})
export class IntegrationModule {}
