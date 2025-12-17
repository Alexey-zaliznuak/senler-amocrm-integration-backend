import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsEnum, IsInt, IsOptional, IsString, IsUrl, ValidateNested } from 'class-validator';

enum FieldType {
  TRACKING_DATA = 'tracking_data',
}

enum EntityType {
  LEADS = 'leads',
}

export interface PipelineStatus {
  id: number;
  name: string;
  sort: number;
  is_editable: boolean;
  pipeline_id: number;
  color: string;
  type: number;
  account_id: number;
}

export interface Pipeline {
  id: number;
  name: string;
  sort: number;
  is_main: boolean;
  is_unsorted_on: boolean;
  is_archive: boolean;
  account_id: number;
  _embedded: {
    statuses: PipelineStatus[];
  };
}

export interface GetPipelinesResponse {
  _embedded: {
    pipelines: Pipeline[];
  };
}

export interface User {
  id: number;
  name: string;
  email: string;
  lang: string;
  rights: {
    leads: {
      view: string;
      edit: string;
      add: string;
      delete: string;
      export: string;
    };
  };
}

export interface GetUsersResponse {
  _embedded: {
    users: User[];
  };
}

export class LinkDto {
  @ApiProperty({ description: 'URL ссылки' })
  @IsUrl()
  href: string;
}

export class LinksDto {
  @ApiProperty({ description: 'Ссылка на себя', type: LinkDto })
  @ValidateNested()
  @Type(() => LinkDto)
  self: LinkDto;
}

export class FieldDto {
  @ApiProperty({ description: 'Идентификатор поля' })
  @IsInt()
  id: number;

  @ApiProperty({ description: 'Название поля' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Тип поля', enum: FieldType })
  @IsEnum(FieldType)
  type: string;

  @ApiProperty({ description: 'Идентификатор аккаунта' })
  @IsInt()
  account_id: number;

  @ApiProperty({ description: 'Код поля' })
  @IsString()
  code: string;

  @ApiProperty({ description: 'Порядок сортировки' })
  @IsInt()
  sort: number;

  @ApiProperty({ description: 'Доступно только через API' })
  @IsBoolean()
  is_api_only: boolean;

  @ApiProperty({ description: 'Перечисления', required: false })
  @IsOptional()
  enums: any;

  @ApiProperty({ description: 'Идентификатор группы' })
  @IsString()
  group_id: string;

  @ApiProperty({ description: 'Обязательные статусы', type: [Object] })
  @IsArray()
  required_statuses: any[];

  @ApiProperty({ description: 'Возможность удаления' })
  @IsBoolean()
  is_deletable: boolean;

  @ApiProperty({ description: 'Предопределенное поле' })
  @IsBoolean()
  is_predefined: boolean;

  @ApiProperty({ description: 'Тип сущности', enum: EntityType })
  @IsEnum(EntityType)
  entity_type: string;

  @ApiProperty({ description: 'Callback для отслеживания', required: false })
  @IsOptional()
  tracking_callback: any;

  @ApiProperty({ description: 'Напоминание', required: false })
  @IsOptional()
  remind: any;

  @ApiProperty({ description: 'Триггеры', type: [Object] })
  @IsArray()
  triggers: any[];

  @ApiProperty({ description: 'Валюта', required: false })
  @IsOptional()
  currency: any;

  @ApiProperty({ description: 'Скрытые статусы', type: [Object] })
  @IsArray()
  hidden_statuses: any[];

  @ApiProperty({ description: 'Связанные списки', required: false })
  @IsOptional()
  chained_lists: any;

  @ApiProperty({ description: 'Ссылки', type: LinksDto })
  @ValidateNested()
  @Type(() => LinksDto)
  _links: LinksDto;
}

export class StatusDto {
  @ApiProperty({ description: 'Идентификатор статуса' })
  @IsInt()
  id: number;

  @ApiProperty({ description: 'Название статуса' })
  @IsString()
  name: string;
}

export class PipelineDto {
  @ApiProperty({ description: 'Идентификатор воронки' })
  @IsInt()
  id: number;

  @ApiProperty({ description: 'Название воронки' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Статусы воронки', type: [StatusDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StatusDto)
  statuses: StatusDto[];
}

export class UserDto {
  @ApiProperty({ description: 'Идентификатор пользователя' })
  @IsInt()
  id: number;

  @ApiProperty({ description: 'Имя пользователя' })
  @IsString()
  name: string;
}
