import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';
import { AmocrmOauthService } from './amocrm-oauth.service';
import {
  AmoCrmOAuthCallbackRequestDto,
  AmoCrmOAuthCallbackResponseDto,
  AmoCrmOAuthSessionStatusResponseDto,
  CreateAmoCrmOAuthSessionRequestDto,
  CreateAmoCrmOAuthSessionResponseDto,
} from './dto/amocrm-oauth.dto';

/**
 * Мобильный OAuth-флоу amoCRM: full-page переход вместо popup.
 * Desktop popup-флоу (`AmoAuthButton`/`postMessage`) продолжает работать независимо от этих эндпоинтов.
 */
@Controller('oauth/amocrm')
export class AmocrmOauthController {
  constructor(private readonly amocrmOauthService: AmocrmOauthService) {}

  @Post('sessions')
  @HttpCode(HttpStatus.CREATED)
  @ApiResponse({ status: HttpStatus.CREATED, type: CreateAmoCrmOAuthSessionResponseDto })
  async createSession(@Body() body: CreateAmoCrmOAuthSessionRequestDto): Promise<CreateAmoCrmOAuthSessionResponseDto> {
    return await this.amocrmOauthService.createSession(body);
  }

  @Post('callback')
  @HttpCode(HttpStatus.OK)
  @ApiResponse({ status: HttpStatus.OK, type: AmoCrmOAuthCallbackResponseDto })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'OAuth-сессия не найдена или истекла.' })
  async callback(@Body() body: AmoCrmOAuthCallbackRequestDto): Promise<AmoCrmOAuthCallbackResponseDto> {
    return await this.amocrmOauthService.handleCallback(body);
  }

  @Get('sessions/:sessionId')
  @HttpCode(HttpStatus.OK)
  @ApiResponse({ status: HttpStatus.OK, type: AmoCrmOAuthSessionStatusResponseDto })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'OAuth-сессия не найдена или истекла.' })
  async getSessionStatus(@Param('sessionId') sessionId: string): Promise<AmoCrmOAuthSessionStatusResponseDto> {
    return await this.amocrmOauthService.getStatus(sessionId);
  }
}
