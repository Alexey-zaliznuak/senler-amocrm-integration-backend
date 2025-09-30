import { ApiProperty } from '@nestjs/swagger';
import { AmoCrmProfile, SenlerGroup } from '@prisma/client';
import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { BaseModelDto } from 'src/infrastructure/dto';

export type SenlerGroupDto = Pick<
  SenlerGroup,
  | 'id'
  | 'createdAt'
  | 'updatedAt'
  | 'senlerGroupId'
  | 'senlerApiAccessToken'
>;

export type BaseAmoCrmProfile = Pick<
  AmoCrmProfile,
  | 'id'
  | 'createdAt'
  | 'updatedAt'
  | 'domainName'
  | 'accessToken'
  | 'refreshToken'
  | 'rateLimit'
>;

export class BaseAmoCrmProfileDto extends BaseModelDto implements BaseAmoCrmProfile {
  @ApiProperty({ description: 'AmoCRM domain name' })
  @IsString()
  @IsNotEmpty()
  domainName: string;

  @ApiProperty({ description: 'Access token from AmoCRM' })
  @IsString()
  @IsNotEmpty()
  accessToken: string;

  @ApiProperty({ description: 'Refresh token from AmoCRM' })
  @IsString()
  @IsNotEmpty()
  refreshToken: string;

  @ApiProperty({ description: 'Rate limit from AmoCRM' })
  @IsNumber()
  rateLimit: number | null;
}

export class BaseSenlerGroupDto extends BaseModelDto implements SenlerGroupDto {
  @ApiProperty({ description: 'Senler group Id' })
  @IsNumber()
  @IsNotEmpty()
  senlerGroupId: number;

  @ApiProperty({ description: 'Senler API access token' })
  @IsString()
  @IsNotEmpty()
  senlerApiAccessToken: string;
}
