import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';
import { AmocrmOauthService } from './amocrm-oauth.service';
import {
  CreateSenlerOAuthSessionRequestDto,
  CreateSenlerOAuthSessionResponseDto,
  SenlerOAuthCallbackRequestDto,
  SenlerOAuthCallbackResponseDto,
} from './dto/amocrm-oauth.dto';

/**
 * Первый (Senler) хоп мобильной регистрации. Второй хоп (amoCRM) — см. AmocrmOauthController.
 * Desktop popup-флоу (SenlerAuthButton без активной серверной сессии) эти эндпоинты не затрагивает.
 */
@Controller('oauth/senler')
export class SenlerOauthController {
  constructor(private readonly amocrmOauthService: AmocrmOauthService) {}

  @Post('sessions')
  @HttpCode(HttpStatus.CREATED)
  @ApiResponse({ status: HttpStatus.CREATED, type: CreateSenlerOAuthSessionResponseDto })
  async createSession(@Body() body: CreateSenlerOAuthSessionRequestDto): Promise<CreateSenlerOAuthSessionResponseDto> {
    return await this.amocrmOauthService.createSenlerSession(body);
  }

  @Post('callback')
  @HttpCode(HttpStatus.OK)
  @ApiResponse({ status: HttpStatus.OK, type: SenlerOAuthCallbackResponseDto })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'OAuth-сессия не найдена или истекла.' })
  async callback(@Body() body: SenlerOAuthCallbackRequestDto): Promise<SenlerOAuthCallbackResponseDto> {
    return await this.amocrmOauthService.handleSenlerCallback(body);
  }
}
