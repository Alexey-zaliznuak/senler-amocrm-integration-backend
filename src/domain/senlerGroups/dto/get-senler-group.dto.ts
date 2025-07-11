import { ApiProperty, PickType } from '@nestjs/swagger';
import { Prisma } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsArray, ValidateNested } from 'class-validator';
import { GetIntegrationStepTemplateResponseDto } from './../../integrationStepTemplates/dto/get-integration-step-template.dto';
import { BaseSenlerGroupDto } from './basic-senler-group.dto';

export type SenlerGroupFieldForGetByUniqueField = keyof Pick<Prisma.SenlerGroupWhereUniqueInput, 'id' | 'senlerGroupId'>;

export const SenlerGroupNumericFieldsForGetByUniqueFields = ['senlerGroupId'];

export enum SenlerGroupFieldForGetByUniqueFieldEnum {
  id = 'id',
  senlerGroupId = 'senlerGroupId',
}

export class GetSenlerGroupResponseDto
  extends PickType(BaseSenlerGroupDto, ['id', 'senlerGroupId'] as const)
{
  @ApiProperty({
    description: 'Templates',
    type: () => [GetIntegrationStepTemplateResponseDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GetIntegrationStepTemplateResponseDto)
  integrationStepTemplates: GetIntegrationStepTemplateResponseDto[];
}
