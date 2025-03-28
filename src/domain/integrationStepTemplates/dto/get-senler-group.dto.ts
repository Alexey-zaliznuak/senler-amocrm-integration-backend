import { PickType } from '@nestjs/swagger';
import { BaseIntegrationStepTemplate, BaseIntegrationStepTemplateDto } from './basic-senler-group-template.dto';

export type GetIntegrationStepTemplateResponse = Pick<BaseIntegrationStepTemplate, 'id' | 'name' | 'settings'>;

export class GetIntegrationStepTemplateResponseDto
  extends PickType(BaseIntegrationStepTemplateDto, ['id', 'name', 'settings'] as const)
  implements GetIntegrationStepTemplateResponse {}


export class GetSenlerGroupResponseDto extends PickType(BaseIntegrationStepTemplateDto, ['id', 'name', 'settings'] as const) {}
