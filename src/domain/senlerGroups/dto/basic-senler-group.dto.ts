import { ApiProperty } from '@nestjs/swagger';
import { SenlerGroup } from '@prisma/client';
import { IsNotEmpty, IsString } from 'class-validator';
import { BaseModelDto } from 'src/infrastructure/dto';

export type BaseSenlerGroup = Pick<
  SenlerGroup,
  'id' | 'createdAt' | 'updatedAt' | 'amoCrmDomainName' | 'amoCrmAccessToken' | 'amoCrmRefreshToken' | 'senlerAccessToken' | 'senlerGroupId' | 'senlerGroupVkId' | 'senlerSign'
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
  @IsString()
  @IsNotEmpty()
  senlerGroupId: string;

  @ApiProperty({ description: 'Senler VK Group Id' })
  @IsString()
  @IsNotEmpty()
  senlerGroupVkId: string;

  @ApiProperty({ description: 'Senler sign' })
  @IsString()
  @IsNotEmpty()
  senlerSign: string;
}
