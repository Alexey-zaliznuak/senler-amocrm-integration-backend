import {
  IsInt,
  IsString,
  IsBoolean,
  IsOptional,
  IsArray,
  ValidateNested,
  IsObject,
  IsEnum,
  IsUrl,
} from 'class-validator';
import { Type } from 'class-transformer';

// Enums
enum FieldType {
  TRACKING_DATA = 'tracking_data',
}

enum EntityType {
  LEADS = 'leads',
}

// Nested DTOs
class LinkDto {
  @IsUrl()
  href: string;
}

class LinksDto {
  @ValidateNested()
  @Type(() => LinkDto)
  self: LinkDto;
}

class FieldDto {
  @IsInt()
  id: number;

  @IsString()
  name: string;

  @IsEnum(FieldType)
  type: string;

  @IsInt()
  account_id: number;

  @IsString()
  code: string;

  @IsInt()
  sort: number;

  @IsBoolean()
  is_api_only: boolean;

  @IsOptional()
  enums: any;

  @IsString()
  group_id: string;

  @IsArray()
  required_statuses: any[];

  @IsBoolean()
  is_deletable: boolean;

  @IsBoolean()
  is_predefined: boolean;

  @IsEnum(EntityType)
  entity_type: string;

  @IsOptional()
  tracking_callback: any;

  @IsOptional()
  remind: any;

  @IsArray()
  triggers: any[];

  @IsOptional()
  currency: any;

  @IsArray()
  hidden_statuses: any[];

  @IsOptional()
  chained_lists: any;

  @ValidateNested()
  @Type(() => LinksDto)
  _links: LinksDto;
}

class StatusDto {
  @IsInt()
  id: number;

  @IsString()
  name: string;
}

class PipelineDto {
  @IsInt()
  id: number;

  @IsString()
  name: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StatusDto)
  statuses: StatusDto[];
}

class UserDto {
  @IsInt()
  id: number;

  @IsString()
  name: string;
}

export class AmoCrmWorkspaceInfoDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FieldDto)
  fields: FieldDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PipelineDto)
  pipelines: PipelineDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UserDto)
  users: UserDto[];
}
