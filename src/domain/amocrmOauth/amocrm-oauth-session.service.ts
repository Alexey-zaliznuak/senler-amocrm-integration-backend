import { Inject, Injectable } from '@nestjs/common';
import { randomBytes, randomUUID } from 'crypto';
import { AppConfigType } from 'src/infrastructure/config/config.app-config';
import { CONFIG } from 'src/infrastructure/config/config.module';
import { RedisService } from 'src/infrastructure/redis/redis.service';
import {
  AMOCRM_OAUTH_PUBLIC_STATE_PREFIX,
  AMOCRM_OAUTH_REDIS_SESSION_PREFIX,
  AMOCRM_OAUTH_REDIS_STATE_PREFIX,
} from './amocrm-oauth.config';
import { AmoCrmOAuthSessionPurpose, AmoCrmOAuthSessionStage, AmoCrmOAuthSessionStatus } from './dto/amocrm-oauth.dto';

export interface AmoCrmOAuthSession {
  sessionId: string;
  state: string;
  purpose: AmoCrmOAuthSessionPurpose;
  /** Только для purpose=register: на каком внешнем провайдере сейчас находится сессия. */
  stage?: AmoCrmOAuthSessionStage;
  senlerGroupId: number;
  senlerAuthorizationCode?: string;
  status: AmoCrmOAuthSessionStatus;
  amoCrmDomainName?: string;
  error?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Redis-хранилище для короткоживущих сессий мобильной авторизации amoCRM.
 * Не задействует PostgreSQL: данные существуют только на время прохождения OAuth (см. AMO_CRM_OAUTH_SESSION_TTL_SEC).
 */
@Injectable()
export class AmocrmOauthSessionService {
  constructor(
    private readonly redis: RedisService,
    @Inject(CONFIG) private readonly config: AppConfigType
  ) {}

  public async create(data: {
    purpose: AmoCrmOAuthSessionPurpose;
    stage?: AmoCrmOAuthSessionStage;
    senlerGroupId: number;
    senlerAuthorizationCode?: string;
  }): Promise<AmoCrmOAuthSession> {
    const now = new Date().toISOString();

    const session: AmoCrmOAuthSession = {
      sessionId: randomUUID(),
      state: this.createState(),
      purpose: data.purpose,
      stage: data.stage,
      senlerGroupId: data.senlerGroupId,
      senlerAuthorizationCode: data.senlerAuthorizationCode,
      status: AmoCrmOAuthSessionStatus.Pending,
      createdAt: now,
      updatedAt: now,
    };

    const ttl = this.config.AMO_CRM_OAUTH_SESSION_TTL_SEC;

    await this.redis.set(this.buildSessionKey(session.sessionId), JSON.stringify(session), ttl);
    // Отдельный индекс по state — callback от amoCRM приходит только со state, без sessionId.
    await this.redis.set(this.buildStateKey(session.state), session.sessionId, ttl);

    return session;
  }

  public async findByState(state: string): Promise<AmoCrmOAuthSession | null> {
    const sessionId = await this.redis.get(this.buildStateKey(state));
    if (!sessionId) return null;

    return this.findById(sessionId);
  }

  public async findById(sessionId: string): Promise<AmoCrmOAuthSession | null> {
    const raw = await this.redis.get(this.buildSessionKey(sessionId));
    if (!raw) return null;

    return JSON.parse(raw) as AmoCrmOAuthSession;
  }

  public async update(sessionId: string, patch: Partial<AmoCrmOAuthSession>): Promise<AmoCrmOAuthSession> {
    const existing = await this.findById(sessionId);
    if (!existing) {
      throw new Error(`OAuth-сессия "${sessionId}" не найдена или истекла`);
    }

    const updated: AmoCrmOAuthSession = {
      ...existing,
      ...patch,
      updatedAt: new Date().toISOString(),
    };

    // Сохраняем оставшимся TTL сессии не критично: окно жизни короткое (минуты),
    // а обновление статуса происходит один раз сразу после callback.
    await this.redis.set(this.buildSessionKey(sessionId), JSON.stringify(updated), this.config.AMO_CRM_OAUTH_SESSION_TTL_SEC);

    return updated;
  }

  /**
   * Переводит сессию на новый `state` (второй хоп цепочки Senler -> amoCRM для purpose=register).
   * Старый индекс `state -> sessionId` удаляется, чтобы callback от первого провайдера
   * нельзя было повторно применить к сессии после того, как она перешла на следующий этап.
   */
  public async rotateState(sessionId: string): Promise<{ session: AmoCrmOAuthSession; newState: string }> {
    const existing = await this.findById(sessionId);
    if (!existing) {
      throw new Error(`OAuth-сессия "${sessionId}" не найдена или истекла`);
    }

    const previousState = existing.state;
    const newState = this.createState();
    const updated: AmoCrmOAuthSession = { ...existing, state: newState, updatedAt: new Date().toISOString() };

    const ttl = this.config.AMO_CRM_OAUTH_SESSION_TTL_SEC;
    await this.redis.set(this.buildSessionKey(sessionId), JSON.stringify(updated), ttl);
    await this.redis.set(this.buildStateKey(newState), sessionId, ttl);
    await this.redis.delete(this.buildStateKey(previousState));

    return { session: updated, newState };
  }

  private buildSessionKey(sessionId: string): string {
    return `${AMOCRM_OAUTH_REDIS_SESSION_PREFIX}${sessionId}`;
  }

  private buildStateKey(state: string): string {
    return `${AMOCRM_OAUTH_REDIS_STATE_PREFIX}${state}`;
  }

  private createState(): string {
    return `${AMOCRM_OAUTH_PUBLIC_STATE_PREFIX}${randomBytes(32).toString('base64url')}`;
  }
}
