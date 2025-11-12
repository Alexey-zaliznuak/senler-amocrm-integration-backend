import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, ValidateNested } from 'class-validator';
import { FieldDto, PipelineDto, UserDto } from 'src/external/amo-crm/get-workspace-info.dto';

export class AmoCrmWorkspaceInfoDto {
  @ApiProperty({ description: 'Поля рабочего пространства', type: [FieldDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FieldDto)
  fields: FieldDto[];

  @ApiProperty({ description: 'Воронки продаж', type: [PipelineDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PipelineDto)
  pipelines: PipelineDto[];

  @ApiProperty({ description: 'Пользователи системы', type: [UserDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UserDto)
  users: UserDto[];
}
