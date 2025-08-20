import { Inject, Injectable } from '@nestjs/common';
import { AppConfigType } from 'src/infrastructure/config/config.app-config';
import { CONFIG } from 'src/infrastructure/config/config.module';
import { PRISMA } from 'src/infrastructure/database/database.config';
import { PrismaExtendedClientType } from 'src/infrastructure/database/database.service';
import { RedisService } from 'src/infrastructure/redis/redis.service';
import { Logger } from 'winston';
import { LOGGER_INJECTABLE_NAME } from './amo-crm.config';
import { AmoCrmError, AmoCrmExceptionType } from './amo-crm.dto';

export const SENLER_GROUP_AMO_CRM_RATE_LIMIT_CACHE_KEY = 'senlerGroup:amoCrm:rateLimit:';
export const AMO_CRM_RATE_LIMIT_WINDOW_IN_SECONDS = 1;

@Injectable()
export class RateLimitsService {
  constructor(
    @Inject(PRISMA) private readonly prisma: PrismaExtendedClientType,
    @Inject(CONFIG) private readonly config: AppConfigType,
    @Inject(LOGGER_INJECTABLE_NAME) private readonly logger: Logger,
    private readonly redisService: RedisService
  ) {}

  /**
   * Для домена в амо проверяет лимит(берется из бд).
   *
   * Если не превышен - увеличивает его.
   *
   * Если превышен - выбрасывает исключение.
   */
  async updateRateLimitAndThrowIfNeed(domainName: string, increment?: number) {
    increment = increment ?? 1;
    const profile = await this.prisma.amoCrmProfile.findUniqueWithCache({ where: { domainName } });

    if (!profile) {
      return;
    }

    const { rate, allowed } = await this.redisService.incrementSlidingWindowRate(
      this.buildWindowKey(domainName),
      profile.rateLimit,
      AMO_CRM_RATE_LIMIT_WINDOW_IN_SECONDS,
      increment
    );

    if (!allowed) {
      this.logger.info('CANCEL REQUEST', {
        tm: Date.now(),
        labels: {
          debug: 'cancel_request',
        },
      });
      throw new AmoCrmError(AmoCrmExceptionType.TOO_MANY_REQUESTS, true);
    }

    this.logger.info('ACCEPT REQUEST', {
      tm: Date.now(),
      labels: {
        debug: 'accept_request',
      },
    });
  }

  async getRateInfo(domainName: string): Promise<{ currentRate: number; maxRate: number }> {
    const [currentRate, profile] = await Promise.all([
      this.redisService.getSlidingWindowRateAtomic(this.buildWindowKey(domainName), AMO_CRM_RATE_LIMIT_WINDOW_IN_SECONDS),
      this.prisma.amoCrmProfile.findUniqueWithCache({ where: { domainName } }),
    ]);

    return { currentRate, maxRate: profile.rateLimit };
  }

  public buildWindowKey = (amoCrmDomainName: string) => SENLER_GROUP_AMO_CRM_RATE_LIMIT_CACHE_KEY + `:{${amoCrmDomainName}}`;
  // public buildWindowKeyOld = (amoCrmDomainName: string) => SENLER_GROUP_AMO_CRM_RATE_LIMIT_CACHE_KEY + amoCrmDomainName;
}
