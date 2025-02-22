import { DynamicModule, Global, Module } from '@nestjs/common';
import { LoggingModule } from '../logging/logging.module';
import { PRISMA } from './database.config';
import { PrismaCacheExtensionService } from './extensions';
import { DatabaseService } from './database.service';

@Global()
@Module({
  providers: [PrismaCacheExtensionService, DatabaseService],
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
            const client = databaseService.createExtendedClient();
            await client.$connect();
            return client;
          },
          inject: [DatabaseService],
        },
      ],
      exports: [PRISMA, DatabaseService],
    };
  }
}
