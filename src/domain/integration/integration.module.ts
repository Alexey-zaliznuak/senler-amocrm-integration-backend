import { forwardRef, Module } from '@nestjs/common';
import { AmoCrmModule } from 'src/external/amo-crm';
import { SenlerModule } from 'src/external/senler/senler.module';
import { LoggingModule } from 'src/infrastructure/logging/logging.module';
import { RabbitmqModule } from 'src/infrastructure/rabbitmq/rabbitmq.module';
import { RedisModule } from 'src/infrastructure/redis/redis.module';
import { SenlerGroupsModule } from '../senlerGroups/senler-groups.module';
import { MetricsModule } from '../metrics/metrics.module';
import { LOGGER_INJECTABLE_NAME } from './integration.config';
import { IntegrationController } from './integration.controller';
import { IntegrationService } from './integration.service';

@Module({
  imports: [
    forwardRef(() => MetricsModule),
    LoggingModule.forFeature(LOGGER_INJECTABLE_NAME),
    AmoCrmModule,
    SenlerModule,
    RabbitmqModule,
    RedisModule,
    SenlerGroupsModule,
  ],
  controllers: [IntegrationController],
  providers: [IntegrationService],
  exports: [IntegrationService],
})
export class IntegrationModule {}
