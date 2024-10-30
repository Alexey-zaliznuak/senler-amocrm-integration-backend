import { BaseUserDto } from './basic-user.dto';
import { ApiProperty, PickType } from "@nestjs/swagger";
import { User } from "@prisma/client";
import { IsNotEmpty, IsString } from "class-validator";
import { BaseModelDto } from "src/infrastructure/dto/base-model.dto";

export type CreateUser = Pick<User,
  | "amoAccessToken"
  | "amoRefreshToken"
  | "senlerAccessToken"
  | "senlerVkGroupId"
>

export class CreateUserDto extends PickType(
  BaseUserDto, [
    "amoAccessToken",
    "amoRefreshToken",
    "senlerAccessToken",
    "senlerVkGroupId",
  ] as const
) implements CreateUser {};
