import { ApiProperty, PickType } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';
import { BaseSenlerGroup, BaseSenlerGroupDto } from './basic-senler-group.dto';

export type CreateSenlerGroupRequest = Pick<BaseSenlerGroup, 'amoCrmDomainName' | 'senlerAccessToken' | 'senlerGroupId' | 'senlerGroupVkId'> & {
  amoCrmAuthorizationCode: string;
}

export class CreateSenlerGroupRequestDto extends PickType(BaseSenlerGroupDto, [
  'amoCrmDomainName',
  'senlerAccessToken',
  'senlerGroupId',
  'senlerGroupVkId',
] as const) implements CreateSenlerGroupRequest {
  @ApiProperty({ description: 'Auth code from amoCRM' })
  @IsString()
  @IsNotEmpty()
  amoCrmAuthorizationCode: string;
}

export class CreateSenlerGroupResponseDto extends PickType(BaseSenlerGroupDto, ['id', 'senlerGroupId'] as const) {}
