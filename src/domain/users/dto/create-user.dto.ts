import { BaseUserDto } from './basic-user.dto';
import { ApiProperty, PickType, PartialType } from "@nestjs/swagger";
import { User } from "@prisma/client";
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateUserDto extends PickType(
  BaseUserDto, [
    "senlerAccessToken",
    "senlerVkGroupId",
  ] as const
) {
  @ApiProperty({description: "Auth token from AmoCRM"})
  @IsString()
  @IsNotEmpty()
  amoAuthToken: string;
}
