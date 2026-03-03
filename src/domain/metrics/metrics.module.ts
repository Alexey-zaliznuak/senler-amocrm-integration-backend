import { forwardRef, Module } from '@nestjs/common';
import { IntegrationModule } from '../integration/integration.module';
import { MetricsController } from './metrics.controller';
import { MetricsService } from './metrics.service';

@Module({
  controllers: [MetricsController],
  providers: [MetricsService],
  imports: [forwardRef(() => IntegrationModule)],
  exports: [MetricsService],
})
export class MetricsModule {}
