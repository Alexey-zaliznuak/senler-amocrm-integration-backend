import { Module } from '@nestjs/common';
import { IntegrationStepTemplatesController } from './integration-step-template.controller';
import { IntegrationStepTemplatesService } from './integration-step-template.service';

@Module({
  controllers: [IntegrationStepTemplatesController],
  providers: [IntegrationStepTemplatesService],
  exports: [IntegrationStepTemplatesService],
})
export class IntegrationStepTemplatesModule {}
