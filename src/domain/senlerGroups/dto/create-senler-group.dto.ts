import { ApiProperty, PickType } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';
import { BaseSenlerGroupDto } from './basic-senler-group.dto';

export class CreateSenlerGroupDto extends PickType(BaseSenlerGroupDto, ['senlerAccessToken', 'senlerVkGroupId', 'amoCrmAccessToken', 'amoCrmRefreshToken'] as const) {}

export class CreateSenlerGroupRequestDto extends PickType(BaseSenlerGroupDto, ['amoCrmDomainName', 'senlerAccessToken', 'senlerVkGroupId'] as const) {
  @ApiProperty({ description: 'Auth code from AmoCRM' })
  @IsString()
  @IsNotEmpty()
  amoCrmAuthorizationCode: string;
}

export class CreateSenlerGroupResponseDto extends PickType(BaseSenlerGroupDto, ['id', 'senlerVkGroupId'] as const) {}
