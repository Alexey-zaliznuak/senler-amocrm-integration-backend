import { Module } from '@nestjs/common';
import { createClient } from 'redis';
import { Logger } from 'winston';
import { AppConfigType } from '../config/config.app-config';
import { CONFIG } from '../config/config.module';
import { LoggingModule } from '../logging/logging.module';
import { LOGGER_INJECTABLE_NAME, REDIS } from './redis.config';
import { RedisService } from './redis.service';

@Module({
  imports: [LoggingModule.forFeature(LOGGER_INJECTABLE_NAME)],
  providers: [RedisService],
  exports: [RedisService],
})
export class RedisModule {
  public forRoot() {
    return {
      module: RedisModule,
      imports: [LoggingModule.forFeature(LOGGER_INJECTABLE_NAME)],
      providers: [
        {
          provide: REDIS,
          useFactory: (appConfig: AppConfigType, logger: Logger, redisService: RedisService) => {
            const client = createClient({
              url: appConfig.CACHE_DATABASE_URL,
              socket: {
                tls: !appConfig.CACHE_DATABASE_URL.includes('localhost'),
                rejectUnauthorized: false,
                reconnectStrategy: (attempts, cause) => {
                  logger.warn(`Reconnect attempt ${attempts}, cause: ${cause}`);
                  return Math.min(attempts * 100, 1000);
                },
              },
            });
            redisService.setupEventHandlers(client as any);
            redisService.connectClientIfNeed(client as any);
            return client;
          },
          inject: [CONFIG, LOGGER_INJECTABLE_NAME],
        },
      ],
      exports: [REDIS],
    };
  }
}
