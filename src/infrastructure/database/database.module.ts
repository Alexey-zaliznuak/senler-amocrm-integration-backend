import { DynamicModule, Global, Module } from '@nestjs/common';
import { LoggingModule } from '../logging/logging.module';
import { PRISMA } from './database.config';
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
      imports: [LoggingModule.forFeature(PRISMA)],
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
