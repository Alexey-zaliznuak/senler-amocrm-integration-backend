import { PickType } from '@nestjs/swagger';
import { BaseIntegrationStepTemplateDto } from './basic-integration-step-template.dto';

export class GetIntegrationStepTemplateResponseDto extends PickType(BaseIntegrationStepTemplateDto, [
  'id',
  'name',
  'settings',
] as const) {}

export class GetSenlerGroupResponseDto extends PickType(BaseIntegrationStepTemplateDto, ['id', 'name', 'settings'] as const) {}
