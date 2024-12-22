import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsString, IsNotEmpty, ValidateNested, IsEnum, IsOptional, IsObject } from "class-validator";


export enum BotStepType {
  SendDataToAmoCrm = 'SEND_DATA_TO_AMO_CRM',
  SendDataToSenler = 'SEND_DATA_TO_SENLER',
}

export class BotStepWebhookDto {
  @ApiProperty({description: "Step settings"})
  @IsNotEmpty()
  @ValidateNested()
  @Type(() => StepIntegrationInfoDto)
  publicIntegrationInfo: StepIntegrationInfoDto;

  @ApiProperty({description: "lead"})
  @IsNotEmpty()
  @ValidateNested()
  @Type(() => LeadDto)
  lead: LeadDto;
}

export class StepIntegrationInfoDto {
  @ApiProperty({description: "user"})
  @IsNotEmpty()
  @IsEnum(BotStepType)
  type: BotStepType;
}


export class LeadDto {
  @ApiProperty({description: "lead id"})
  @IsNotEmpty()
  @IsString()
  id: string;

  @ApiProperty({description: "lead name"})
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({description: "lead surname"})
  @IsNotEmpty()
  @IsString()
  surname: string;

  @IsObject()
  @IsNotEmpty()
  personalVars: Record<string, string | number | boolean>; // TODO check for empty vars
}

// "integrationSecret": "85f346fa12cf86efa4ebc48ba6e9f2f79ab78665bb86d91d6bbef25431828a5c",
// backend-1  |             "publicIntegrationInfo": "{\"publicText\":\"qwe\",\"token\":\"type\",\"type\":\"qw\"}",
// backend-1  |             "user": {
// backend-1  |                 "leadId": "66db1078287a7ca40c579097",
// backend-1  |                 "name": "Алексей",
// backend-1  |                 "personalVars": {
// backend-1  |                     "lolol": 1234,
// backend-1  |                     "xtime": 138
// backend-1  |                 },
// backend-1  |                 "surname": "Зализняк"
// backend-1  |             }