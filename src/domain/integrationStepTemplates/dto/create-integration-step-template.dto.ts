import { PickType } from '@nestjs/swagger';
import { BaseIntegrationStepTemplate, BaseIntegrationStepTemplateDto } from './basic-integration-step-template.dto';

export class CreateIntegrationStepTemplateRequestDto extends PickType(BaseIntegrationStepTemplateDto, ['name', 'settings', 'senlerGroupId'] as const) {}

export class CreateIntegrationStepTemplateResponseDto extends PickType(BaseIntegrationStepTemplateDto, [
  'id',
  'name',
  'settings',
  'senlerGroupId',
] as const) {}
