import { PickType } from '@nestjs/swagger';
import { BaseIntegrationStepTemplate, BaseIntegrationStepTemplateDto } from './basic-integration-step-template.dto';

export type CreateIntegrationStepTemplateRequest = Pick<BaseIntegrationStepTemplate, 'name' | 'settings' | 'senlerGroupId'>;

export class CreateIntegrationStepTemplateRequestDto
  extends PickType(BaseIntegrationStepTemplateDto, ['name', 'settings', 'senlerGroupId'] as const)
  implements CreateIntegrationStepTemplateRequest {}

export class CreateIntegrationStepTemplateResponseDto extends PickType(BaseIntegrationStepTemplateDto, [
  'id',
  'name',
  'settings',
  'senlerGroupId',
] as const) {}
