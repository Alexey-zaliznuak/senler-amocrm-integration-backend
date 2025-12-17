import { ApiProperty } from '@nestjs/swagger';
import { plainToInstance, Transform, Type } from 'class-transformer';
import { IsArray, IsEnum, IsNotEmpty, IsNumber, IsString, IsUUID, ValidateIf, ValidateNested } from 'class-validator';
import { IsStringOrNumber } from 'src/infrastructure/validation';
import { parseJson } from 'src/utils';

export enum BotStepType {
  SendDataToAmoCrm = 'SEND_DATA_TO_AMO_CRM',
  SendDataToSenler = 'SEND_DATA_TO_SENLER',
}

export class TransferPairDto {
  @ApiProperty({ description: 'Identifier of variable from export service.' })
  @IsStringOrNumber()
  from: string | number;

  @ApiProperty({ description: 'Identifier of variable from import service.' })
  @IsStringOrNumber()
  to: string | number;
}

export class AmoCrmTransferringSettingsDto {
  @ApiProperty({ description: 'Айди воронки' })
  @ValidateIf(obj => obj.pipelineId != null)
  @IsNumber()
  pipelineId: number | null;

  @ApiProperty({ description: 'Айди статуса в воронке' })
  @ValidateIf(obj => obj.statusId != null)
  @IsNumber()
  statusId: number | null;

  @ApiProperty({ description: 'Цена сделки' })
  @Transform(({ value }) => (value != null ? String(value) : value))
  @ValidateIf(obj => obj.price != null)
  @IsString()
  price: string | null;

  @ApiProperty({ description: 'Наименование сделки' })
  @ValidateIf(obj => obj.name != null)
  @IsString()
  name: string | null;

  @ApiProperty({ description: 'Ответственный за сделку' })
  @ValidateIf(obj => obj.responsibleUserId != null)
  @IsNumber()
  responsibleUserId: number | null;
}

export class PublicBotStepSettingsDto {
  @ApiProperty({ description: 'bot step type', enum: BotStepType })
  @IsNotEmpty()
  @IsEnum(BotStepType)
  type: BotStepType;

  @ApiProperty({
    description: 'Record of variables identifiers(name or id) as keys and values, data will be synced from keys to values.',
  })
  @Transform(({ value }) => (value || []).filter((pair: any) => pair.from !== '' && pair.to !== ''))
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TransferPairDto)
  syncableVariables: Array<TransferPairDto>;

  @ApiProperty({
    description: 'Специфичные для амо настройки.',
  })
  @Transform(({ value }) => value ?? {}, { toClassOnly: true })
  @ValidateNested()
  @Type(() => AmoCrmTransferringSettingsDto)
  amoCrmTransferringSettings: AmoCrmTransferringSettingsDto;
}

export class LeadDto {
  @ApiProperty({ description: 'Senler lead id.' })
  @IsNotEmpty()
  @IsString()
  id: string;

  @ApiProperty({ description: 'Lead name.' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Lead surname.' })
  @IsString()
  surname: string;

  @ApiProperty({ description: 'Senler lead`s personal vars.' })
  personalVars: Array<void> | Record<string, string | number | boolean> | null;

  @ApiProperty({ description: 'Lead vk user id.' })
  @IsNotEmpty()
  @IsNumber()
  vkUserId: number;

  @ApiProperty({ description: 'Страна лида' })
  @Transform(({ value }) => value ?? 'null', { toClassOnly: true })
  @IsString()
  country: string;

  @ApiProperty({ description: 'Город лида' })
  @Transform(({ value }) => value ?? 'null', { toClassOnly: true })
  @IsString()
  city: string;

  @ApiProperty({ description: 'TG username лида' })
  @Transform(({ value }) => value ?? 'null', { toClassOnly: true })
  @IsString()
  tgUsername: string;

  @ApiProperty({ description: 'Доменная страница в ВК' })
  @Transform(({ value }) => value ?? 'null', { toClassOnly: true })
  @IsString()
  vkDomain: string;

  @ApiProperty({ description: 'Семейное положение лида' })
  @Transform(({ value }) => (value != null ? String(value) : 'null'), { toClassOnly: true })
  @IsString()
  maritalStatus: string;
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

  @ApiProperty({
    description: 'Integration callbackKey(захардкоденное в вебхуке значение для проверки подлинности запроса)',
    example: 'acde070d-8c4c-4f0d-9d8a-162843c10333',
  })
  @IsNotEmpty()
  @IsString()
  integrationCallbackKey: string;

  @ApiProperty({ description: 'Bot callback.', type: BotCallbackDto })
  @ValidateIf(obj => obj.botCallback != null)
  @IsNotEmpty()
  @ValidateNested()
  @Type(() => BotCallbackDto)
  botCallback: BotCallbackDto | null;
}

export class SenlerGroupIdQueryDto {
  @ApiProperty({ description: 'Id of Senler group.' })
  @IsNotEmpty()
  @IsNumber()
  senlerGroupId: number;
}

export class UnlinkAmoCrmAccountRequestDto {
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
  @Type(() => TransferMessageMetadata)
  metadata: TransferMessageMetadata;
}

export class ChangeAmoCrmAccountRequestDto {
  @ApiProperty({ description: 'AmoCRM domain name' })
  @IsString()
  @IsNotEmpty()
  amoCrmDomainName: string;

  @ApiProperty({ description: 'Auth code from amoCRM' })
  @IsString()
  @IsNotEmpty()
  amoCrmAuthorizationCode: string;

  @ApiProperty({ description: 'Id of Senler group.' })
  @IsNotEmpty()
  @IsNumber()
  senlerGroupId: number;
}
