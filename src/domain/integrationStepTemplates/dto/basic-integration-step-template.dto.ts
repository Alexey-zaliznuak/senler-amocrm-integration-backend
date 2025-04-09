import { ApiProperty } from '@nestjs/swagger';
import { IntegrationStepTemplate, Prisma } from '@prisma/client';
import { IsNotEmpty, IsString, Validate } from 'class-validator';
import { BaseModelDto } from 'src/infrastructure/dto';

export type BaseIntegrationStepTemplate = Pick<
  IntegrationStepTemplate,
  'id' | 'createdAt' | 'updatedAt' | 'name' | 'settings' | 'senlerGroupId'
>;

export class BaseIntegrationStepTemplateDto extends BaseModelDto implements BaseIntegrationStepTemplate {
  @ApiProperty({ description: 'Template name' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Template settings' })
  @IsNotEmpty()
  settings: Prisma.JsonValue;

  @ApiProperty({ description: 'Senler Group object id' })
  @IsString()
  @IsNotEmpty()
  senlerGroupId: string;
}
