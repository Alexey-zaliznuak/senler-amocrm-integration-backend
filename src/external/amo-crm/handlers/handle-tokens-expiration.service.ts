import { HttpStatus, Inject, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { AxiosResponse } from 'axios';
import { CustomAxiosInstance } from 'src/infrastructure/axios/instance';
import { AppConfigType } from 'src/infrastructure/config/config.app-config';
import { CONFIG } from 'src/infrastructure/config/config.module';
import { PRISMA } from 'src/infrastructure/database/database.config';
import { PrismaExtendedClientType } from 'src/infrastructure/database/database.service';
import { LOGGER } from 'src/infrastructure/logging/logging.config';
import { LoggingService } from 'src/infrastructure/logging/logging.service';
import { RedisService } from 'src/infrastructure/redis/redis.service';
import { timeToMilliseconds, timeToSeconds } from 'src/utils';
import { AXIOS_INJECTABLE_NAME } from '../amo-crm.config';
import { AmoCrmTokens } from '../amo-crm.dto';
import { RateLimitsService } from '../rate-limit.service';
import { Logger } from 'winston';

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
    public readonly rateLimitsService: RateLimitsService,
    @Inject(LOGGER) private readonly logger: Logger
  ) {}
  async refresh({ amoCrmDomainName, tokens }: { tokens: AmoCrmTokens; amoCrmDomainName: string }): Promise<AmoCrmTokens> {
    const lockKey = `amoCrmProfiles:${amoCrmDomainName}:locks:refreshTokens`;
    const lockTtlSec = timeToSeconds({ seconds: 30 }); // ↑ немного больше, чем 10с, чтобы покрыть сеть/джиттер
    const started = Date.now();

    const MAX_WAIT_MS = timeToMilliseconds({ seconds: 60 });
    const MAX_ATTEMPTS = 8;
    let attempt = 0;

    while (true) {
      // 1) Пытаемся взять лок; только владелец делает refresh
      let acquired = await this.redis.acquireLock(lockKey, lockTtlSec);
      if (acquired) {
        try {
          // ВАЖНО: списываем лимит ТОЛЬКО у владельца лока. Если нельзя — освобождаем лок и ждём окно.
          try {
            // Если у вашего RateLimitsService есть «предварительная проверка» — используйте её.
            // Здесь вызываем ваш метод, который бросит исключение при превышении.
            await this.rateLimitsService.updateRateLimitAndThrowIfNeed(amoCrmDomainName, 1);
          } catch (rateErr: any) {
            // мы не должны держать лок, если лимит не позволяет — иначе застопорим всех
            // Можно вытащить из ошибки время до окна, если сервис возвращает его.
            // Пример: const delayMs = rateErr?.msToReset ?? 500; (подстройте под ваш формат)
            const delayMs = Math.min(150 * 2 ** attempt + Math.floor(Math.random() * 125), 2000);
            return (await (async () => {
              await this.redis.releaseLock(lockKey);
              await sleep(delayMs);
              // после сна цикл продолжится заново (конкуренты могли успеть обновить)
              // Перед возвратом из IIFE просто проваливаемся дальше
            })().then(() => {
              // «continue» тут невозможен из-за try/finally, поэтому делаем пустой return и падём в конец цикла
            })) as unknown as AmoCrmTokens;
          }

          // --- здесь мы владелец лока И лимит позволяет сделать запрос ---
          // (Опционально: продлить TTL лока перед сетью, если есть prolong)
          // await this.redis.prolongLock(lockKey, lockTtlSec);

          let response: AxiosResponse;
          try {
            response = await this.axiosService.post(`https://${amoCrmDomainName}/oauth2/access_token`, {
              client_id: this.config.AMO_CRM_CLIENT_ID,
              client_secret: this.config.AMO_CRM_CLIENT_SECRET,
              grant_type: 'refresh_token',
              refresh_token: tokens.refreshToken,
              redirect_uri: this.config.AMO_CRM_REDIRECT_URI,
            });
            this.logger.info("Токен единолично обновлен")
          } catch (e: any) {
            // Если AmoCRM вернул 400 invalid_grant — это не 503 и не 401,
            // это «протухший refresh»: надо инициировать re-connect в продукте.
            const status = e?.response?.status;
            const data = e?.response?.data;
            if (status === 400 && (data?.hint === 'invalid_grant' || data?.error === 'invalid_grant')) {
              // Бросаем специфичную ошибку, чтобы слой выше не ретраил бесконечно
              throw new ServiceUnavailableException('AmoCRM refresh failed: invalid_grant (needs re-connect)');
            }
            throw e;
          }

          if (response.status !== HttpStatus.OK) {
            throw new ServiceUnavailableException(`Can not refresh token ${response.status} ${JSON.stringify(response.data)}`);
          }

          const newAccess = response.data?.access_token;
          const newRefresh = response.data?.refresh_token;

          await this.prisma.amoCrmProfile.updateWithCacheInvalidate({
            where: { domainName: amoCrmDomainName },
            data: { accessToken: newAccess, refreshToken: newRefresh },
          });

          return { accessToken: newAccess, refreshToken: newRefresh };
        } finally {
          // NB: лучше снимать лок по «owner token», если RedisService это поддерживает
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

        if (profile && (profile.accessToken !== tokens.accessToken || profile.refreshToken !== tokens.refreshToken)) {
          return {
            accessToken: profile.accessToken,
            refreshToken: profile.refreshToken,
          };
        }

        // Никто не обновил — начнём новый «сеанс ожидания»
        attempt = 0;
      }

      // Контрольное окно TOCTOU: пробуем ещё раз мгновенно
      acquired = await this.redis.acquireLock(lockKey, lockTtlSec);
      if (acquired) {
        // Перейдём к секции 1 на следующей итерации
        continue;
      }

      // Спим с экспоненциальным бэкоффом и джиттером
      const base = 150;
      const backoff = Math.min(base * 2 ** attempt, 2000);
      const jitter = Math.floor(Math.random() * 125);
      await sleep(backoff + jitter);
      attempt++;

      // Быстрая проверка БД после сна
      const profileAfter = await this.prisma.amoCrmProfile.findUnique({
        where: { domainName: amoCrmDomainName },
      });

      if (
        profileAfter &&
        (profileAfter.accessToken !== tokens.accessToken || profileAfter.refreshToken !== tokens.refreshToken)
      ) {
        return {
          accessToken: profileAfter.accessToken,
          refreshToken: profileAfter.refreshToken,
        };
      }
    }
  }
}
