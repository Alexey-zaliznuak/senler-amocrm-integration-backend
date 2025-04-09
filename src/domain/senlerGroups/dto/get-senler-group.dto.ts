import { ApiProperty, PickType } from '@nestjs/swagger';
import { Prisma } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsArray, ValidateNested } from 'class-validator';
import { GetIntegrationStepTemplateResponse } from 'src/domain/integrationStepTemplates/dto/get-integration-step-template.dto';
import { GetIntegrationStepTemplateResponseDto } from './../../integrationStepTemplates/dto/get-integration-step-template.dto';
import { BaseSenlerGroup, BaseSenlerGroupDto } from './basic-senler-group.dto';

export type SenlerGroupFieldForGetByUniqueField = keyof Pick<Prisma.SenlerGroupWhereUniqueInput, 'id' | 'senlerGroupId'>;
export const SenlerGroupNumericFieldsForGetByUniqueFields = ['senlerGroupId'];
export enum SenlerGroupFieldForGetByUniqueFieldEnum {
  id = 'id',
  senlerGroupId = 'senlerGroupId',
}

export type GetSenlerGroupResponse = Pick<BaseSenlerGroup, 'id' | 'amoCrmDomainName' | 'senlerGroupId'> & {
  integrationStepTemplates: GetIntegrationStepTemplateResponse[];
};

export class GetSenlerGroupResponseDto
  extends PickType(BaseSenlerGroupDto, ['id', 'amoCrmDomainName', 'senlerGroupId'] as const)
  implements GetSenlerGroupResponse
{
  @ApiProperty({
    description: 'Templates',
    type: () => [GetIntegrationStepTemplateResponseDto], // Указываем тип массива
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GetIntegrationStepTemplateResponseDto)
  integrationStepTemplates: GetIntegrationStepTemplateResponseDto[];
}
