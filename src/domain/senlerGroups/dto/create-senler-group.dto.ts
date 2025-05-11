import { ApiProperty, PickType } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';
import { BaseSenlerGroup, BaseSenlerGroupDto } from './basic-senler-group.dto';

export class CreateSenlerGroupRequestDto extends PickType(BaseSenlerGroupDto, [
  'amoCrmDomainName',
  'senlerGroupId',
  'senlerApiAccessToken'
] as const) {
  @ApiProperty({ description: 'Auth code from amoCRM' })
  @IsString()
  @IsNotEmpty()
  amoCrmAuthorizationCode: string;
}

export class CreateSenlerGroupResponseDto extends PickType(BaseSenlerGroupDto, ['id', 'senlerGroupId'] as const) {}
