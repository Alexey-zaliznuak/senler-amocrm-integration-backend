import { DynamicModule, Global, Module } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { Logger } from 'winston';
import { AppConfigType } from '../config/config.app-config';
import { CONFIG } from '../config/config.module';
import { LoggingModule } from '../logging/logging.module';
import { DATABASE, LOGGER_INJECTABLE_NAME } from './database.config';
import { existsExtension, PrismaCacheExtensionService } from './extensions';

@Global()
@Module({})
export class DatabaseModule {
  static forRoot(): DynamicModule {
    return {
      module: DatabaseModule,
      imports: [LoggingModule.forFeature(DATABASE)],
      providers: [
        {
          provide: DATABASE,
          useFactory: (appConfig: AppConfigType, logger: Logger) => {
            return this.buildPrismaClient(appConfig, logger);
          },
          inject: [CONFIG, LOGGER_INJECTABLE_NAME],
        },
      ],
      exports: [DATABASE],
    };
  }

  private static buildPrismaClient(appConfig: AppConfigType, logger: Logger) {
    return new PrismaCacheExtensionService(appConfig, logger).applyExtension(new PrismaClient()).$extends(existsExtension);
  }
}
