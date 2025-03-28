import { Module } from '@nestjs/common';
import { IntegrationStepTemplateController } from './senler-groups.controller';
import { IntegrationStepTemplatesService } from './senler-groups.service';

@Module({
  controllers: [IntegrationStepTemplateController],
  providers: [IntegrationStepTemplatesService],
  exports: [IntegrationStepTemplatesService],
})
export class SenlerGroupsModule {}
