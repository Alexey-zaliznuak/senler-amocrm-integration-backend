import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsDate } from 'class-validator';

export class BaseModelDto {
  @ApiProperty({ description: 'Unique identifier', format: 'uuid' })
  @IsUUID()
  id: string;

  @ApiProperty({
    description: 'Timestamp of when the record was created',
    type: Date,
  })
  @IsDate()
  createdAt: Date;

  @ApiProperty({
    description: 'Timestamp of the last update of the record',
    type: Date,
  })
  @IsDate()
  updatedAt: Date;
}
