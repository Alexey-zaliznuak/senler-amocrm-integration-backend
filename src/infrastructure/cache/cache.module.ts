import { DynamicModule, Module } from '@nestjs/common';
import { Logger } from 'winston';
import { AppConfigType } from '../config/config.app-config';
import { CONFIG } from '../config/config.module';
import { LOGGER } from '../logging/logging.config';
import { CustomCacheClient } from './cache.client';
import { CacheService } from './cache.service';

@Module({
  providers: [CacheService],
})
export class CacheModule {
  static forFeature(context?: string): DynamicModule {
    context = CacheService.buildInjectableNameByContext(context);

    return {
      module: CacheModule,
      providers: [
        {
          provide: context,
          useFactory: (config: AppConfigType, logger: Logger) => {
            return new CustomCacheClient(config, logger, context);
          },
          inject: [CONFIG, LOGGER],
        },
      ],
      exports: [context],
    };
  }
}
