import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { AppConfigType } from 'src/infrastructure/config/config.app-config';
import { CONFIG } from 'src/infrastructure/config/config.module';
import { convertExceptionToString } from 'src/utils';
import { Logger } from 'winston';
import { IntegrationService } from '../integration/integration.service';
import { SenlerGroupsService } from '../senlerGroups/senler-groups.service';
import { AmocrmOauthSessionService, AmoCrmOAuthSession } from './amocrm-oauth-session.service';
import { LOGGER_INJECTABLE_NAME } from './amocrm-oauth.config';
import {
  AmoCrmOAuthCallbackRequestDto,
  AmoCrmOAuthCallbackResponseDto,
  AmoCrmOAuthSessionPurpose,
  AmoCrmOAuthSessionStage,
  AmoCrmOAuthSessionStatus,
  AmoCrmOAuthSessionStatusResponseDto,
  CreateAmoCrmOAuthSessionRequestDto,
  CreateAmoCrmOAuthSessionResponseDto,
  CreateSenlerOAuthSessionRequestDto,
  CreateSenlerOAuthSessionResponseDto,
  SenlerOAuthCallbackRequestDto,
  SenlerOAuthCallbackResponseDto,
} from './dto/amocrm-oauth.dto';

/**
 * Оркестрация мобильной OAuth-авторизации amoCRM и Senler.
 *
 * Desktop popup-флоу (AmoAuthButton/SenlerAuthButton без активной серверной сессии) этот сервис
 * не затрагивает — он используется только когда фронтенд явно создаёт сессию перед full-page
 * переходом на мобильных устройствах. `redirect_uri` не меняется: остаются те же `/to` и
 * `/get_senler_code`, что зарегистрированы в amoCRM/Senler.
 *
 * Для purpose=register регистрация требует code от ДВУХ провайдеров подряд (сначала Senler,
 * потом amoCRM). На мобильных между этими шагами нет промежуточного возврата в iframe Senler
 * (там негде надёжно хранить промежуточный код), поэтому обе стадии живут в одной сессии:
 * `createSenlerSession` -> `handleSenlerCallback` (ротация state, stage: senler -> amocrm) ->
 * `handleCallback` (существующий amoCRM callback, использует уже сохранённый senlerAuthorizationCode).
 */
@Injectable()
export class AmocrmOauthService {
  constructor(
    private readonly sessionService: AmocrmOauthSessionService,
    private readonly senlerGroupsService: SenlerGroupsService,
    private readonly integrationService: IntegrationService,
    @Inject(CONFIG) private readonly config: AppConfigType,
    @Inject(LOGGER_INJECTABLE_NAME) private readonly logger: Logger
  ) {}

  public async createSession(data: CreateAmoCrmOAuthSessionRequestDto): Promise<CreateAmoCrmOAuthSessionResponseDto> {
    const session = await this.sessionService.create(data);

    return {
      sessionId: session.sessionId,
      authorizeUrl: this.buildAuthorizeUrl(session.state),
      expiresAt: new Date(Date.now() + this.config.AMO_CRM_OAUTH_SESSION_TTL_SEC * 1000).toISOString(),
    };
  }

  public async handleCallback(body: AmoCrmOAuthCallbackRequestDto): Promise<AmoCrmOAuthCallbackResponseDto> {
    const session = await this.sessionService.findByState(body.state);
    if (!session) {
      throw new NotFoundException('OAuth-сессия не найдена или истекла');
    }

    // Защита от использования state, выданного для Senler-этапа той же сессии (см. handleSenlerCallback):
    // к моменту завершения Senler-шага этот state уже должен быть заменён новым через rotateState.
    if (session.stage === AmoCrmOAuthSessionStage.Senler) {
      throw new NotFoundException('OAuth-сессия не найдена или истекла');
    }

    // Идемпотентность: повторный вызов (например, повторная загрузка /to) не должен
    // заново обменивать одноразовый code amoCRM.
    if (session.status !== AmoCrmOAuthSessionStatus.Pending) {
      return this.toCallbackResponse(session);
    }

    if (body.error || !body.code || !body.referer) {
      const failed = await this.sessionService.update(session.sessionId, {
        status: AmoCrmOAuthSessionStatus.Failed,
        error: body.error || 'Авторизация amoCRM не была завершена',
      });
      return this.toCallbackResponse(failed);
    }

    try {
      await this.completeAuthorization(session, body.code, body.referer);

      const completed = await this.sessionService.update(session.sessionId, {
        status: AmoCrmOAuthSessionStatus.Completed,
        amoCrmDomainName: body.referer,
      });

      return this.toCallbackResponse(completed);
    } catch (error) {
      this.logger.error('Не удалось завершить мобильную авторизацию amoCRM', {
        sessionId: session.sessionId,
        purpose: session.purpose,
        error: convertExceptionToString(error),
      });

      const failed = await this.sessionService.update(session.sessionId, {
        status: AmoCrmOAuthSessionStatus.Failed,
        error: this.extractHumanErrorMessage(error),
      });

      return this.toCallbackResponse(failed);
    }
  }

  public async createSenlerSession(data: CreateSenlerOAuthSessionRequestDto): Promise<CreateSenlerOAuthSessionResponseDto> {
    const session = await this.sessionService.create({
      purpose: AmoCrmOAuthSessionPurpose.Register,
      stage: AmoCrmOAuthSessionStage.Senler,
      senlerGroupId: data.senlerGroupId,
    });

    return {
      sessionId: session.sessionId,
      authorizeUrl: this.buildSenlerAuthorizeUrl(session.state, session.senlerGroupId),
      expiresAt: new Date(Date.now() + this.config.AMO_CRM_OAUTH_SESSION_TTL_SEC * 1000).toISOString(),
    };
  }

  public async handleSenlerCallback(body: SenlerOAuthCallbackRequestDto): Promise<SenlerOAuthCallbackResponseDto> {
    const session = await this.sessionService.findByState(body.state);
    if (!session || session.stage !== AmoCrmOAuthSessionStage.Senler) {
      throw new NotFoundException('OAuth-сессия не найдена или истекла');
    }

    if (session.status !== AmoCrmOAuthSessionStatus.Pending) {
      return this.toSenlerCallbackResponse(session);
    }

    if (body.error || !body.code) {
      const failed = await this.sessionService.update(session.sessionId, {
        status: AmoCrmOAuthSessionStatus.Failed,
        error: body.error || 'Авторизация Senler не была завершена',
      });
      return this.toSenlerCallbackResponse(failed);
    }

    // Переходим на второй хоп цепочки: старый state (Senler) инвалидируется, выпускается новый (amoCRM).
    const { newState } = await this.sessionService.rotateState(session.sessionId);
    const updated = await this.sessionService.update(session.sessionId, {
      stage: AmoCrmOAuthSessionStage.AmoCrm,
      senlerAuthorizationCode: body.code,
    });

    return {
      ...this.toSenlerCallbackResponse(updated),
      nextAuthorizeUrl: this.buildAuthorizeUrl(newState),
    };
  }

  public async getStatus(sessionId: string): Promise<AmoCrmOAuthSessionStatusResponseDto> {
    const session = await this.sessionService.findById(sessionId);
    if (!session) {
      throw new NotFoundException('OAuth-сессия не найдена или истекла');
    }

    return { ...this.toCallbackResponse(session), purpose: session.purpose };
  }

  private async completeAuthorization(session: AmoCrmOAuthSession, code: string, amoCrmDomainName: string): Promise<void> {
    if (session.purpose === AmoCrmOAuthSessionPurpose.Register) {
      await this.senlerGroupsService.create({
        senlerGroupId: session.senlerGroupId,
        amoCrmDomainName,
        amoCrmAuthorizationCode: code,
        senlerAuthorizationCode: session.senlerAuthorizationCode,
      });
      return;
    }

    await this.integrationService.changeAmoCrmAccount({
      senlerGroupId: session.senlerGroupId,
      amoCrmDomainName,
      amoCrmAuthorizationCode: code,
    });
  }

  private buildAuthorizeUrl(state: string): string {
    const authUrl = new URL('https://www.amocrm.ru/oauth');
    authUrl.searchParams.append('client_id', this.config.AMO_CRM_CLIENT_ID);
    authUrl.searchParams.append('redirect_uri', this.config.AMO_CRM_REDIRECT_URI);
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('state', state);

    return authUrl.toString();
  }

  private buildSenlerAuthorizeUrl(state: string, senlerGroupId: number): string {
    const authUrl = new URL('https://senler.ru/cabinet/OAuth2authorize');
    authUrl.searchParams.append('client_id', this.config.SENLER_CLIENT_ID);
    authUrl.searchParams.append('redirect_uri', this.config.SENLER_REDIRECT_URI);
    authUrl.searchParams.append('group_id', String(senlerGroupId));
    authUrl.searchParams.append('state', state);

    return authUrl.toString();
  }

  private toSenlerCallbackResponse(session: AmoCrmOAuthSession): SenlerOAuthCallbackResponseDto {
    return {
      sessionId: session.sessionId,
      status: session.status,
      senlerGroupId: session.senlerGroupId,
      error: session.error,
    };
  }

  private toCallbackResponse(session: AmoCrmOAuthSession): AmoCrmOAuthCallbackResponseDto {
    return {
      sessionId: session.sessionId,
      status: session.status,
      senlerGroupId: session.senlerGroupId,
      amoCrmDomainName: session.amoCrmDomainName,
      error: session.error,
    };
  }

  private extractHumanErrorMessage(error: unknown): string {
    if (error instanceof Error) return error.message;
    return 'Не удалось завершить авторизацию amoCRM';
  }
}
