import { Inject, Injectable } from '@nestjs/common';
import { PRISMA } from 'src/infrastructure/database/database.config';
import { PrismaExtendedClientType } from 'src/infrastructure/database/database.service';
import { RedisService } from 'src/infrastructure/redis/redis.service';
import { AmoCrmError, AmoCrmExceptionType } from './amo-crm.dto';

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
  async updateRateLimitAndThrowIfNeed(amoCrmDomainName: string, increment?: number) {
    increment = increment ?? 1;
    const group = await this.prisma.senlerGroup.findUniqueWithCache({ where: { amoCrmDomainName } });
    const { rate, allowed } = await this.redisService.incrementSlidingWindowRate(
      this.buildWindowKey(amoCrmDomainName),
      group.amoCrmRateLimit,
      AMO_CRM_RATE_LIMIT_WINDOW_IN_SECONDS,
      increment
    );

    if (!allowed) throw new AmoCrmError(AmoCrmExceptionType.TOO_MANY_REQUESTS, true);
  }

  async getRateInfo(amoCrmDomainName: string): Promise<{ currentRate: number; maxRate: number }> {
    const [currentRate, maxRate] = await Promise.all([
      await this.redisService.getSlidingWindowRate(this.buildWindowKey(amoCrmDomainName), AMO_CRM_RATE_LIMIT_WINDOW_IN_SECONDS),
      (await this.prisma.senlerGroup.findUniqueWithCache({ where: { amoCrmDomainName } })).amoCrmRateLimit,
    ]);

    return { currentRate, maxRate };
  }

  public buildWindowKey = (amoCrmDomainName: string) => SENLER_GROUP_AMO_CRM_RATE_LIMIT_CACHE_KEY + amoCrmDomainName;
}
