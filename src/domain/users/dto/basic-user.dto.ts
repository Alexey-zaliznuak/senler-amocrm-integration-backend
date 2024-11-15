import { ApiProperty } from "@nestjs/swagger";
import { User } from "@prisma/client";
import { IsNotEmpty, IsString } from "class-validator";
import { BaseModelDto } from "src/infrastructure/dto";

export type BaseUser = Pick<User,
  | "id"
  | "createdAt"
  | "updatedAt"
  | "amoCrmAccessToken"
  | "amoCrmRefreshToken"
  | "senlerAccessToken"
  | "senlerVkGroupId"
>

export class BaseUserDto extends BaseModelDto implements BaseUser {
  @ApiProperty({description: "Access token from AmoCRM"})
  @IsString()
  @IsNotEmpty()
  amoCrmAccessToken: string;

  @ApiProperty({description: "Refresh token from AmoCRM"})
  @IsString()
  @IsNotEmpty()
  amoCrmRefreshToken: string;

  @ApiProperty({description: "Access token from Senler"})
  @IsString()
  @IsNotEmpty()
  senlerAccessToken: string;

  @ApiProperty({description: "Senler VK Group Id"})
  @IsString()
  @IsNotEmpty()
  senlerVkGroupId: string;
}
