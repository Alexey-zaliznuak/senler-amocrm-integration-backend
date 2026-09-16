import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, ValidateIf } from 'class-validator';

export enum AmoCrmOAuthSessionPurpose {
  Register = 'register',
  ChangeAccount = 'change_account',
}

export enum AmoCrmOAuthSessionStatus {
  Pending = 'pending',
  Completed = 'completed',
  Failed = 'failed',
}

/**
 * Только для purpose=register: мобильная регистрация состоит из двух внешних редиректов
 * (сначала Senler, потом amoCRM), выполняемых в рамках одной и той же сессии, чтобы
 * `senlerAuthorizationCode`, полученный на первом шаге, дожил до второго без клиентского хранения.
 */
export enum AmoCrmOAuthSessionStage {
  Senler = 'senler',
  AmoCrm = 'amocrm',
}

export class CreateAmoCrmOAuthSessionRequestDto {
  @ApiProperty({ description: 'Назначение сессии авторизации.', enum: AmoCrmOAuthSessionPurpose })
  @IsNotEmpty()
  @IsEnum(AmoCrmOAuthSessionPurpose)
  purpose: AmoCrmOAuthSessionPurpose;

  @ApiProperty({ description: 'Id группы Senler.' })
  @IsNotEmpty()
  @IsNumber()
  senlerGroupId: number;

  @ApiProperty({ description: 'Auth code от Senler. Обязателен для purpose=register.', required: false })
  @ValidateIf(o => o.purpose === AmoCrmOAuthSessionPurpose.Register)
  @IsNotEmpty()
  @IsString()
  senlerAuthorizationCode?: string;
}

export class CreateAmoCrmOAuthSessionResponseDto {
  @ApiProperty({ description: 'Id созданной сессии авторизации.' })
  sessionId: string;

  @ApiProperty({ description: 'Готовый URL для перехода на авторизацию amoCRM.' })
  authorizeUrl: string;

  @ApiProperty({ description: 'Момент истечения сессии, ISO8601.' })
  expiresAt: string;
}

export class AmoCrmOAuthCallbackRequestDto {
  @ApiProperty({ description: 'state, полученный от amoCRM в redirect.' })
  @IsNotEmpty()
  @IsString()
  state: string;

  @ApiProperty({ description: 'Authorization code от amoCRM.', required: false })
  @IsOptional()
  @IsString()
  code?: string;

  @ApiProperty({ description: 'Домен аккаунта amoCRM (referer).', required: false })
  @IsOptional()
  @IsString()
  referer?: string;

  @ApiProperty({ description: 'Код ошибки от amoCRM, если пользователь отменил авторизацию.', required: false })
  @IsOptional()
  @IsString()
  error?: string;
}

export class AmoCrmOAuthCallbackResponseDto {
  @ApiProperty({ description: 'Id сессии авторизации.' })
  sessionId: string;

  @ApiProperty({ description: 'Итоговый статус сессии.', enum: AmoCrmOAuthSessionStatus })
  status: AmoCrmOAuthSessionStatus;

  @ApiProperty({ description: 'Id группы Senler, к которой относится сессия.' })
  senlerGroupId: number;

  @ApiProperty({ description: 'Доменное имя подключённого аккаунта amoCRM.', required: false })
  amoCrmDomainName?: string;

  @ApiProperty({ description: 'Человекочитаемое сообщение об ошибке, если status=failed.', required: false })
  error?: string;
}

export class AmoCrmOAuthSessionStatusResponseDto extends AmoCrmOAuthCallbackResponseDto {
  @ApiProperty({ description: 'Назначение сессии.', enum: AmoCrmOAuthSessionPurpose })
  purpose: AmoCrmOAuthSessionPurpose;
}

export class CreateSenlerOAuthSessionRequestDto {
  @ApiProperty({ description: 'Id группы Senler.' })
  @IsNotEmpty()
  @IsNumber()
  senlerGroupId: number;
}

export class CreateSenlerOAuthSessionResponseDto {
  @ApiProperty({ description: 'Id созданной сессии авторизации.' })
  sessionId: string;

  @ApiProperty({ description: 'Готовый URL для перехода на авторизацию Senler.' })
  authorizeUrl: string;

  @ApiProperty({ description: 'Момент истечения сессии, ISO8601.' })
  expiresAt: string;
}

export class SenlerOAuthCallbackRequestDto {
  @ApiProperty({ description: 'state, полученный от Senler в redirect.' })
  @IsNotEmpty()
  @IsString()
  state: string;

  @ApiProperty({ description: 'Authorization code от Senler.', required: false })
  @IsOptional()
  @IsString()
  code?: string;

  @ApiProperty({ description: 'Код ошибки от Senler, если пользователь отменил авторизацию.', required: false })
  @IsOptional()
  @IsString()
  error?: string;
}

export class SenlerOAuthCallbackResponseDto {
  @ApiProperty({ description: 'Id сессии авторизации.' })
  sessionId: string;

  @ApiProperty({
    description: 'pending — Senler-шаг пройден, нужно перейти по nextAuthorizeUrl; failed — авторизация не удалась.',
    enum: AmoCrmOAuthSessionStatus,
  })
  status: AmoCrmOAuthSessionStatus;

  @ApiProperty({ description: 'Id группы Senler, к которой относится сессия.' })
  senlerGroupId: number;

  @ApiProperty({ description: 'URL для перехода на авторизацию amoCRM. Присутствует только при status=pending.', required: false })
  nextAuthorizeUrl?: string;

  @ApiProperty({ description: 'Человекочитаемое сообщение об ошибке, если status=failed.', required: false })
  error?: string;
}
