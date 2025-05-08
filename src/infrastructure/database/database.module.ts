import { DynamicModule, Global, Module } from '@nestjs/common';
import { LoggingModule } from '../logging/logging.module';
import { LOGGER_INJECTABLE_NAME, PRISMA } from './database.config';
import { DatabaseService } from './database.service';
import { PrismaCacheExtensionService } from './extensions';
import { CustomPrismaClient } from './prisma.custom-client';

@Global()
@Module({
  imports: [LoggingModule.forFeature(PRISMA)],
  providers: [PrismaCacheExtensionService, DatabaseService, CustomPrismaClient],
})
export class DatabaseModule {
  static forRoot(): DynamicModule {
    return {
      module: DatabaseModule,
      imports: [LoggingModule.forFeature(LOGGER_INJECTABLE_NAME)],
      providers: [
        {
          provide: PRISMA,
          useFactory: async (databaseService: DatabaseService) => {
            const client: CustomPrismaClient = databaseService.createExtendedClient() as any;
            await client.connectWithRetry();
            return client;
          },
          inject: [DatabaseService],
        },
      ],
      exports: [PRISMA, DatabaseService, PrismaCacheExtensionService],
    };
  }
}
