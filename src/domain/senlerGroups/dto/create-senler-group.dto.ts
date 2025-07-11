import { ApiProperty, PickType } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';
import { BaseSenlerGroupDto } from './basic-senler-group.dto';

export class CreateSenlerGroupRequestDto extends PickType(BaseSenlerGroupDto, ['senlerGroupId'] as const) {
  @ApiProperty({ description: 'AmoCRM domain name' })
  @IsString()
  @IsNotEmpty()
  amoCrmDomainName: string;

  @ApiProperty({ description: 'Auth code from amoCRM' })
  @IsString()
  @IsNotEmpty()
  amoCrmAuthorizationCode: string;

  @ApiProperty({ description: 'Auth code from Senler' })
  @IsString()
  @IsNotEmpty()
  senlerAuthorizationCode: string;
}

export class CreateSenlerGroupResponseDto extends PickType(BaseSenlerGroupDto, ['id', 'senlerGroupId'] as const) {}
