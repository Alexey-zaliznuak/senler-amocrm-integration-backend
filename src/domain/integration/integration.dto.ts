import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsString, IsNotEmpty, ValidateNested, IsEnum, IsObject } from "class-validator";


export enum BotStepType {
  SendDataToAmoCrm = 'SEND_DATA_TO_AMO_CRM',
  SendDataToSenler = 'SEND_DATA_TO_SENLER',
}


export class PublicBotStepSettingsDto {
  @ApiProperty({description: "user"})
  @IsNotEmpty()
  @IsEnum(BotStepType)
  type: BotStepType;

  @ApiProperty({
    description: "Record of variables identifiers(name or id) as keys and values, data will be synced from keys to values."
  })
  @IsObject()
  @IsNotEmpty()
  syncableVariables: Record<string, string>;
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

  @ApiProperty({description: "Senler lead`s personal vars"})
  @IsObject()
  @IsNotEmpty()
  personalVars: Array<void> | Record<string, string | number | boolean>;
}

export class BotStepWebhookDto {
  @ApiProperty({description: "Public bot step settings"})
  @IsNotEmpty()
  @ValidateNested()
  @Type(() => PublicBotStepSettingsDto)
  publicBotStepSettings: PublicBotStepSettingsDto;

  @ApiProperty({description: "lead"})
  @IsNotEmpty()
  @ValidateNested()
  @Type(() => LeadDto)
  lead: LeadDto;
}
