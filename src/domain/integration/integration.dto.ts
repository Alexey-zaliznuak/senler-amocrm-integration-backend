import { ApiProperty } from '@nestjs/swagger';
import { plainToInstance, Transform, Type } from 'class-transformer';
import { IsArray, IsEnum, IsNotEmpty, IsNumber, IsObject, IsString, IsUUID, ValidateNested } from 'class-validator';
import { IsStringOrNumber } from 'src/infrastructure/validation';
import { parseJson } from 'src/utils';

export enum BotStepType {
  SendDataToAmoCrm = 'SEND_DATA_TO_AMO_CRM',
  SendDataToSenler = 'SEND_DATA_TO_SENLER',
}

export class TransferPairDto {
  @ApiProperty({ description: 'Identifier of variable from export service.' })
  @IsNotEmpty()
  @IsStringOrNumber()
  from: string | number;

  @ApiProperty({ description: 'Identifier of variable from import service.' })
  @IsNotEmpty()
  @IsStringOrNumber()
  to: string | number;
}

export class PublicBotStepSettingsDto {
  @ApiProperty({ description: 'bot step type', enum: BotStepType })
  @IsNotEmpty()
  @IsEnum(BotStepType)
  type: BotStepType;

  @ApiProperty({
    description: 'Record of variables identifiers(name or id) as keys and values, data will be synced from keys to values.',
  })
  @IsArray()
  @IsNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => TransferPairDto)
  syncableVariables: Array<TransferPairDto>;
}

export class LeadDto {
  @ApiProperty({ description: 'Senler lead id.' })
  @IsNotEmpty()
  @IsString()
  id: string;

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
  @IsNumber()
  vkUserId: number;
}

export class BotStepWebhookDto {
  @ApiProperty({ description: 'Senler group id.' })
  @IsNotEmpty()
  @IsNumber()
  senlerGroupId: number;

  @ApiProperty({ description: 'Senler VK group id.' })
  @IsNotEmpty()
  @IsNumber()
  senlerVkGroupId: number;

  @ApiProperty({ description: 'Senler lead.' })
  @IsNotEmpty()
  @ValidateNested()
  @Type(() => LeadDto)
  lead: LeadDto;

  @ApiProperty({ description: 'Public bot step settings.' })
  @Transform(({ value }) => plainToInstance(PublicBotStepSettingsDto, parseJson(value)))
  @IsNotEmpty()
  @ValidateNested()
  @Type(() => PublicBotStepSettingsDto)
  publicBotStepSettings: PublicBotStepSettingsDto;

  @ApiProperty({ description: 'Request uuid', example: "acde070d-8c4c-4f0d-9d8a-162843c10333" })
  @IsNotEmpty()
  @IsUUID()
  requestUuid: string;
}

export class GetSenlerGroupFieldsDto {
  @ApiProperty({ description: 'Id of Senler group.' })
  @IsNotEmpty()
  @IsNumber()
  senlerGroupId: number;
}
