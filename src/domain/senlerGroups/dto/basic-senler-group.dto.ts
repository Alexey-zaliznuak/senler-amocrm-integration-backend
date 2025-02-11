import { ApiProperty } from '@nestjs/swagger';
import { SenlerGroup } from '@prisma/client';
import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { BaseModelDto } from 'src/infrastructure/dto';

export type BaseSenlerGroup = Pick<
  SenlerGroup,
  | 'id'
  | 'createdAt'
  | 'updatedAt'
  | 'amoCrmDomainName'
  | 'amoCrmAccessToken'
  | 'amoCrmRefreshToken'
  | 'senlerAccessToken'
  | 'senlerGroupId'
  | 'senlerGroupVkId'
  | 'senlerSign'
>;

export class BaseSenlerGroupDto extends BaseModelDto implements BaseSenlerGroup {
  @ApiProperty({ description: 'AmoCRM domain name' })
  @IsString()
  @IsNotEmpty()
  amoCrmDomainName: string;

  @ApiProperty({ description: 'Access token from AmoCRM' })
  @IsString()
  @IsNotEmpty()
  amoCrmAccessToken: string;

  @ApiProperty({ description: 'Refresh token from AmoCRM' })
  @IsString()
  @IsNotEmpty()
  amoCrmRefreshToken: string;

  @ApiProperty({ description: 'Access token from Senler' })
  @IsString()
  @IsNotEmpty()
  senlerAccessToken: string;

  @ApiProperty({ description: 'Senler group Id' })
  @IsNumber()
  @IsNotEmpty()
  senlerGroupId: number;

  @ApiProperty({ description: 'Senler VK Group Id', required: false, default: null })
  @IsOptional()
  @IsString()
  senlerGroupVkId: string | null;

  @ApiProperty({ description: 'Senler sign' })
  @IsString()
  @IsNotEmpty()
  senlerSign: string;
}
