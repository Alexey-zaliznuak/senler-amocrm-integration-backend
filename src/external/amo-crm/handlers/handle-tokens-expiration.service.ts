import { HttpStatus, Inject, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { AxiosResponse } from 'axios';
import { CustomAxiosInstance } from 'src/infrastructure/axios/instance';
import { AppConfig, AppConfigType } from 'src/infrastructure/config/config.app-config';
import { CONFIG } from 'src/infrastructure/config/config.module';
import { PRISMA } from 'src/infrastructure/database/database.config';
import { PrismaExtendedClientType } from 'src/infrastructure/database/database.service';
import { LoggingService } from 'src/infrastructure/logging/logging.service';
import { RedisService } from 'src/infrastructure/redis/redis.service';
import { timeToMilliseconds } from 'src/utils';
import { AXIOS_INJECTABLE_NAME } from '../amo-crm.config';
import { AmoCrmTokens } from '../amo-crm.dto';
import { RateLimitsService } from '../rate-limit.service';
import { UpdateRateLimitAndThrowIfNeed } from './rate-limit.decorator';

@Injectable()
export class RefreshTokensService {
  constructor(
    @Inject(AXIOS_INJECTABLE_NAME) private readonly axiosService: CustomAxiosInstance,
    @Inject(CONFIG) private readonly config: AppConfigType,
    @Inject(PRISMA) private readonly prisma: PrismaExtendedClientType,
    private readonly redis: RedisService,
    public readonly rateLimitsService: RateLimitsService // used in UpdateRateLimitAndThrowIfNeed
  ) {}

  @UpdateRateLimitAndThrowIfNeed()
  async refresh({ amoCrmDomainName, tokens }: { tokens: AmoCrmTokens; amoCrmDomainName: string }): Promise<AmoCrmTokens> {
    const lockKey = `amoCrmProfiles:${amoCrmDomainName}:locks:refreshTokens`;
    const lockTtl = timeToMilliseconds({ seconds: 10 });

    let acquired = await this.redis.acquireLock(lockKey, lockTtl);
    let wereLocked = !acquired;

    while (!acquired) {
      await new Promise(resolve => setTimeout(resolve, 200));
      acquired = await this.redis.acquireLock(lockKey, lockTtl);
    }

    // только гетаем новый ключ
    if (wereLocked) {
      const profile = await this.prisma.amoCrmProfile.findUniqueWithCache(
        {
          where: {
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
          },
        },
        { ttl: 5 }
      );

      return {
        accessToken: profile.accessToken,
        refreshToken: profile.refreshToken,
      };
    }

    try {
      const response: AxiosResponse = await this.axiosService.post(`https://${amoCrmDomainName}/oauth2/access_token`, {
        client_id: this.config.AMO_CRM_CLIENT_ID,
        client_secret: this.config.AMO_CRM_CLIENT_SECRET,
        grant_type: 'refresh_token',
        refresh_token: tokens.refreshToken,
        redirect_uri: this.config.AMO_CRM_REDIRECT_URI,
      });

      if (response.status !== HttpStatus.OK) {
        throw new ServiceUnavailableException(`Can not refresh token ${response.status} ${response.data}`);
      }

      await this.prisma.amoCrmProfile.updateWithCacheInvalidate({
        where: {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
        },
        data: {
          accessToken: response.data.access_token,
          refreshToken: response.data.refresh_token,
        },
      });

      // TODO: удалить после релиза
      const logger = new LoggingService(AppConfig).createLogger();
      const profile = await this.prisma.amoCrmProfile.findUniqueWithCache(
        {
          where: {
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
          },
        },
        { ttl: 5 }
      );

      logger.info('Новые ключи получены', {
        old: {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
        },
        new: {
          accessToken: response.data.access_token,
          refreshToken: response.data.refresh_token,
        },
        inCache: {
          accessToken: profile.accessToken,
          refreshToken: profile.refreshToken,
        },
      });
      logger.info(profile.accessToken == response.data.access_token ? 'КЛЮЧИ СОВПАДАЮТ' : 'КЛЮЧИ В КЕШЕ НЕ СОВПАДАЮТ');
      // до сюда

      return {
        accessToken: response.data.access_token,
        refreshToken: response.data.refresh_token,
      };
    } finally {
      await this.redis.releaseLock(lockKey);
    }
  }
}
