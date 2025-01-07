import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsString,
  IsNotEmpty,
  ValidateNested,
  IsEnum,
  IsObject,
  IsArray,
  IsNumber,
} from 'class-validator';
import { IsStringOrNumber } from 'src/infrastructure/validation';

export enum BotStepType {
  SendDataToAmoCrm = 'SEND_DATA_TO_AMO_CRM',
  SendDataToSenler = 'SEND_DATA_TO_SENLER',
}

export class TransferPairDto {
  @ApiProperty({
    description: 'Identifier of variable from export service.',
  })
  @IsNotEmpty()
  @IsStringOrNumber()
  from: string | number;

  @ApiProperty({
    description: 'Identifier of variable from import service.',
  })
  @IsNotEmpty()
  @IsStringOrNumber()
  to: string | number;
}

export class PublicBotStepSettingsDto {
  @ApiProperty({ description: 'bot step type' })
  @IsNotEmpty()
  @IsEnum(BotStepType)
  type: BotStepType;

  @ApiProperty({
    description:
      'Record of variables identifiers(name or id) as keys and values, data will be synced from keys to values.',
  })
  @IsNotEmpty()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TransferPairDto)
  syncableVariables: Array<TransferPairDto>;
}

export class LeadDto {
  @ApiProperty({ description: 'Lead id.' })
  @IsNotEmpty()
  @IsNumber()
  id: number;

  @ApiProperty({ description: 'Lead name.' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({ description: 'Lead surname.' })
  @IsNotEmpty()
  @IsString()
  surname: string;

  @ApiProperty({ description: 'Senler lead`s personal vars.' })
  @IsObject()
  @IsNotEmpty()
  personalVars: Array<void> | Record<string, string | number | boolean>;

  @ApiProperty({ description: 'Lead vk user id.' })
  @IsNotEmpty()
  @IsString()
  vkUserId: string;
}

export class BotStepWebhookDto {
  @ApiProperty({ description: 'Public bot step settings.' })
  @IsNotEmpty()
  @ValidateNested()
  @Type(() => PublicBotStepSettingsDto)
  publicBotStepSettings: PublicBotStepSettingsDto;

  @ApiProperty({ description: 'Lead.' })
  @IsNotEmpty()
  @ValidateNested()
  @Type(() => LeadDto)
  lead: LeadDto;
}
