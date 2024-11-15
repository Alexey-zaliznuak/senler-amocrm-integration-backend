import { BaseUserDto } from './basic-user.dto';
import { ApiProperty, PickType } from "@nestjs/swagger";
import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';


export class CreateUserDto extends PickType(
  BaseUserDto, [
    "senlerAccessToken",
    "senlerVkGroupId",
    "amoCrmAccessToken",
    "amoCrmRefreshToken",
  ] as const
) {}

export class CreateUserRequestDto extends PickType(
  BaseUserDto, [
    "senlerAccessToken",
    "senlerVkGroupId",
  ] as const
) {
  @ApiProperty({description: "domain name of user on AmoCRM"})
  @IsString()
  @IsNotEmpty()
  amoCrmDomain: string;

  @ApiProperty({description: "Auth code from AmoCRM"})
  @IsString()
  @IsNotEmpty()
  amoCrmAuthorizationCode: string;
}
