import { DynamicModule, Global, Module } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { Logger } from 'winston';
import { AppConfigType } from '../config/config.app-config';
import { CONFIG } from '../config/config.module';
import { LoggingModule } from '../logging/logging.module';
import { LOGGER_INJECTABLE_NAME, PRISMA } from './database.config';
import { existsExtension, PrismaCacheExtensionService } from './extensions';


export type ExtendedPrismaClientType = ReturnType<typeof DatabaseModule.buildExtendedPrismaClient>
export const SimplePrismaClient = new PrismaClient().$extends(existsExtension);


@Global()
@Module({})
export class DatabaseModule {
  static forRoot(): DynamicModule {
    return {
      module: DatabaseModule,
      imports: [LoggingModule.forFeature(PRISMA)],
      providers: [
        {
          provide: PRISMA,
          useFactory: (appConfig: AppConfigType, logger: Logger) => {
            return this.buildExtendedPrismaClient(appConfig, logger);
          },
          inject: [CONFIG, LOGGER_INJECTABLE_NAME],
        },
      ],
      exports: [PRISMA],
    };
  }

  public static buildExtendedPrismaClient(appConfig: AppConfigType, logger: Logger) {
    return new PrismaCacheExtensionService(appConfig, logger).applyExtension(new PrismaClient()).$extends(existsExtension);
  }
}
