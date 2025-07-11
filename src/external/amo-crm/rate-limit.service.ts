import { Inject, Injectable } from '@nestjs/common';
import { PRISMA } from 'src/infrastructure/database/database.config';
import { PrismaExtendedClientType } from 'src/infrastructure/database/database.service';
import { RedisService } from 'src/infrastructure/redis/redis.service';
import { AmoCrmError, AmoCrmExceptionType } from './amo-crm.dto';
import { AppConfig } from 'src/infrastructure/config/config.app-config';
import { LoggingService } from 'src/infrastructure/logging/logging.service';

export const SENLER_GROUP_AMO_CRM_RATE_LIMIT_CACHE_KEY = 'senlerGroup:amoCrm:rateLimit:';
export const AMO_CRM_RATE_LIMIT_WINDOW_IN_SECONDS = 1;

@Injectable()
export class RateLimitsService {
  constructor(
    @Inject(PRISMA) private readonly prisma: PrismaExtendedClientType,
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

    if (!allowed) throw new AmoCrmError(AmoCrmExceptionType.TOO_MANY_REQUESTS, true);
  }

  async getRateInfo(domainName: string): Promise<{ currentRate: number; maxRate: number }> {
    const [currentRate, profile] = await Promise.all([
      this.redisService.getSlidingWindowRate(this.buildWindowKey(domainName), AMO_CRM_RATE_LIMIT_WINDOW_IN_SECONDS),
      this.prisma.amoCrmProfile.findUniqueWithCache({ where: { domainName } }),
    ]);

    return { currentRate, maxRate: profile.rateLimit };
  }

  public buildWindowKey = (amoCrmDomainName: string) => SENLER_GROUP_AMO_CRM_RATE_LIMIT_CACHE_KEY + amoCrmDomainName;
}
