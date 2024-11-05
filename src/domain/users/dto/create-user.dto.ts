import { BaseUserDto } from './basic-user.dto';
import { PickType } from "@nestjs/swagger";
import { User } from "@prisma/client";

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
