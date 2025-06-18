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
  personalVars: Array<void> | Record<string, string | number | boolean> | null;

  @ApiProperty({ description: 'Lead vk user id.' })
  @IsNotEmpty()
  @IsNumber()
  vkUserId: number;
}

class ResultDto {
  @ApiProperty({ description: 'Error code.' })
  @IsNotEmpty()
  @IsNumber()
  error_code: number;
}

export class BotCallbackDto {
  @ApiProperty({ description: 'Bot id.' })
  @IsNotEmpty()
  @IsNumber()
  bot_id: number;

  @ApiProperty({ description: 'Group id.' })
  @IsNotEmpty()
  @IsNumber()
  group_id: number;

  @ApiProperty({ description: 'Lead id.' })
  @IsNotEmpty()
  @IsString()
  lead_id: string;

  @ApiProperty({ description: 'Result object.', type: ResultDto })
  @IsNotEmpty()
  @ValidateNested()
  @Type(() => ResultDto)
  result: ResultDto;

  @ApiProperty({ description: 'Server id.' })
  @IsNotEmpty()
  @IsNumber()
  server_id: number;

  @ApiProperty({ description: 'Step id.' })
  @IsNotEmpty()
  @IsString()
  step_id: string;

  @ApiProperty({ description: 'Test flag.' })
  @IsNotEmpty()
  @IsNumber()
  test: number;

  @ApiProperty({ description: 'VK user id.' })
  @IsNotEmpty()
  @IsNumber()
  vk_user_id: number;
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

  @ApiProperty({ description: 'Request uuid', example: 'acde070d-8c4c-4f0d-9d8a-162843c10333' })
  @IsNotEmpty()
  @IsUUID()
  requestUuid: string;

  @ApiProperty({ description: 'Integration secret', example: 'acde070d-8c4c-4f0d-9d8a-162843c10333' })
  @IsNotEmpty()
  @IsString()
  integrationSecret: string;

  @ApiProperty({ description: 'Bot callback.', type: BotCallbackDto })
  @IsNotEmpty()
  @ValidateNested()
  @Type(() => BotCallbackDto)
  botCallback: BotCallbackDto;
}

export class GetSenlerGroupFieldsDto {
  @ApiProperty({ description: 'Id of Senler group.' })
  @IsNotEmpty()
  @IsNumber()
  senlerGroupId: number;
}

export class TransferMessageMetadata {
  @ApiProperty({ description: 'Timestamp of message created.' })
  @IsNumber()
  retryNumber?: number;

  @ApiProperty({ description: 'Date of message created.' })
  @IsString()
  createdAt?: string;

  @ApiProperty({ description: 'Last message delay.' })
  @IsString()
  delay?: number;
}

export class TransferMessage {
  @IsNotEmpty()
  @ValidateNested()
  @Type(() => BotStepWebhookDto)
  payload: BotStepWebhookDto;

  @IsNotEmpty()
  @ValidateNested()
  @Type(() => BotStepWebhookDto)
  metadata: TransferMessageMetadata;
}
