import { HttpStatus, Inject, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { AxiosResponse } from 'axios';
import { CustomAxiosInstance } from 'src/infrastructure/axios/instance';
import { AppConfigType } from 'src/infrastructure/config/config.app-config';
import { CONFIG } from 'src/infrastructure/config/config.module';
import { PRISMA } from 'src/infrastructure/database/database.config';
import { PrismaExtendedClientType } from 'src/infrastructure/database/database.service';
import { RedisService } from 'src/infrastructure/redis/redis.service';
import { timeToMilliseconds, timeToSeconds } from 'src/utils';
import { AXIOS_INJECTABLE_NAME } from '../amo-crm.config';
import { AmoCrmTokens } from '../amo-crm.dto';
import { RateLimitsService } from '../rate-limit.service';
import { UpdateRateLimitAndThrowIfNeed } from './rate-limit.decorator';

function sleep(ms: number) {
  return new Promise(res => setTimeout(res, ms));
}

@Injectable()
export class RefreshTokensService {
  constructor(
    @Inject(AXIOS_INJECTABLE_NAME) private readonly axiosService: CustomAxiosInstance,
    @Inject(CONFIG) private readonly config: AppConfigType,
    @Inject(PRISMA) private readonly prisma: PrismaExtendedClientType,
    private readonly redis: RedisService,
    public readonly rateLimitsService: RateLimitsService
  ) {}

  @UpdateRateLimitAndThrowIfNeed()
  async refresh({
    amoCrmDomainName,
    tokens,
  }: {
    tokens: AmoCrmTokens;
    amoCrmDomainName: string;
  }): Promise<AmoCrmTokens> {
    const lockKey = `amoCrmProfiles:${amoCrmDomainName}:locks:refreshTokens`;
    const lockTtlSec = timeToSeconds({ seconds: 10 });
    const started = Date.now();

    const MAX_WAIT_MS = timeToMilliseconds({seconds: 60});
    const MAX_ATTEMPTS = 8;             // попытки опроса + acquire
    let attempt = 0;

    while (true) {
      // 1) Пытаемся ВЗЯТЬ лок; если взяли — мы обновляем токены
      let acquired = await this.redis.acquireLock(lockKey, lockTtlSec);
      if (acquired) {
        try {
          const response: AxiosResponse = await this.axiosService.post(
            `https://${amoCrmDomainName}/oauth2/access_token`,
            {
              client_id: this.config.AMO_CRM_CLIENT_ID,
              client_secret: this.config.AMO_CRM_CLIENT_SECRET,
              grant_type: 'refresh_token',
              refresh_token: tokens.refreshToken,
              redirect_uri: this.config.AMO_CRM_REDIRECT_URI,
            }
          );

          if (response.status !== HttpStatus.OK) {
            throw new ServiceUnavailableException(
              `Can not refresh token ${response.status} ${JSON.stringify(response.data)}`
            );
          }

          const newAccess = response.data?.access_token;
          const newRefresh = response.data?.refresh_token;

          await this.prisma.amoCrmProfile.updateWithCacheInvalidate({
            where: { domainName: amoCrmDomainName },
            data: { accessToken: newAccess, refreshToken: newRefresh },
          });

          return { accessToken: newAccess, refreshToken: newRefresh };
        } finally {
          // Разлочиваем ТОЛЬКО если мы действительно владелец
          await this.redis.releaseLock(lockKey);
        }
      }

      // 2) Лок у кого-то другого: ждём с бэкоффом
      const now = Date.now();
      if (now - started > MAX_WAIT_MS || attempt >= MAX_ATTEMPTS) {
        // Мы достаточно подождали. Проверим БД: вдруг уже обновили.
        const profile = await this.prisma.amoCrmProfile.findUnique({
          where: { domainName: amoCrmDomainName },
        });

        if (profile && (
            profile.accessToken !== tokens.accessToken ||
            profile.refreshToken !== tokens.refreshToken
          )) {
          // Чужой процесс успел обновить — возвращаем актуальные токены
          return {
            accessToken: profile.accessToken,
            refreshToken: profile.refreshToken,
          };
        }

        // Никто не обновил — делаем «форс»: активно пытаемся взять лок ещё одну «сессию ожидания»
        attempt = 0; // сбросим счётчик для следующего круга ожидания
      }

      // Маленький контрольный чек: если лока уже нет, ПОПЫТАЕМСЯ взять его снова сразу (закрываем TOCTOU)
      // (без этой попытки есть окно между снятием лока и записью в БД)
      acquired = await this.redis.acquireLock(lockKey, lockTtlSec);
      if (acquired) {
        // Переходим к шагу обновления в следующей итерации (чтобы не дублировать код)
        continue;
      }

      // Спим с экспоненциальным бэкоффом и джиттером, затем по кругу
      const base = 150;
      const backoff = Math.min(base * 2 ** attempt, 2000);
      const jitter = Math.floor(Math.random() * 125);
      await sleep(backoff + jitter);
      attempt++;

      // После сна: проверим БД — возможно, уже всё обновили (ускоряет выход из ожидания)
      const profileAfter = await this.prisma.amoCrmProfile.findUnique({
        where: { domainName: amoCrmDomainName },
      });

      if (profileAfter && (
          profileAfter.accessToken !== tokens.accessToken ||
          profileAfter.refreshToken !== tokens.refreshToken
        )) {
        return {
          accessToken: profileAfter.accessToken,
          refreshToken: profileAfter.refreshToken,
        };
      }

      // Иначе — следующий виток цикла: попробуем снова взять лок, либо подождать дальше.
    }
  }
}
