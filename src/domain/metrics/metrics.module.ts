import { Module } from '@nestjs/common';
import { IntegrationModule } from '../integration/integration.module';
import { MetricsController } from './metrics.controller';
import { MetricsService } from './metrics.service';

@Module({
  controllers: [MetricsController],
  providers: [MetricsService],
  imports: [IntegrationModule],
})
export class MetricsModule {}
