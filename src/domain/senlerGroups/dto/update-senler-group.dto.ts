import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class UpdateSenlerGroupAmoCrmCredentialsRequestDto {
  @ApiProperty({ description: 'Auth code from amoCRM' })
  @IsString()
  @IsNotEmpty()
  amoCrmAuthorizationCode: string;
}
