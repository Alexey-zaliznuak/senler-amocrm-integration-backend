import { GetIntegrationStepTemplateResponseDto } from './../../integrationStepTemplates/dto/get-integration-step-template.dto';
import { PickType } from '@nestjs/swagger';
import { Prisma } from '@prisma/client';
import { BaseSenlerGroup, BaseSenlerGroupDto } from './basic-senler-group.dto';
import { GetIntegrationStepTemplateResponse } from 'src/domain/integrationStepTemplates/dto/get-integration-step-template.dto';

export type SenlerGroupFieldForGetByUniqueField = keyof Pick<Prisma.SenlerGroupWhereUniqueInput, 'id' | 'senlerGroupId'>;
export const SenlerGroupNumericFieldsForGetByUniqueFields = ['senlerGroupId'];
export enum SenlerGroupFieldForGetByUniqueFieldEnum {
  id = 'id',
  senlerGroupId = 'senlerGroupId',
}

export type GetSenlerGroupResponse = Pick<BaseSenlerGroup, 'id' | 'amoCrmDomainName' | 'senlerGroupId'> & {
  integrationStepTemplates: GetIntegrationStepTemplateResponse[]
}

export class GetSenlerGroupResponseDto extends PickType(BaseSenlerGroupDto, [
  'id',
  'amoCrmDomainName',
  'senlerGroupId',
] as const) implements GetSenlerGroupResponse {
  integrationStepTemplates: GetIntegrationStepTemplateResponseDto[]
}
