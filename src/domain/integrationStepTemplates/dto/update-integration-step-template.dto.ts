import { PickType } from '@nestjs/swagger';
import { BaseIntegrationStepTemplateDto } from './basic-integration-step-template.dto';

export class UpdateIntegrationStepTemplateRequestDto extends PickType(BaseIntegrationStepTemplateDto, [
  'name',
  'settings',
] as const) {}


export class UpdateIntegrationStepTemplateResponseDto extends PickType(BaseIntegrationStepTemplateDto, [
  'id',
  'name',
  'settings',
  'senlerGroupId',
] as const) {}
