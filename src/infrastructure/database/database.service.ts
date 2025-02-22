import { Injectable, Inject } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { AppConfigType } from '../config/config.app-config';
import { CONFIG } from '../config/config.module';
import { LOGGER_INJECTABLE_NAME } from './database.config';
import { existsExtension, PrismaCacheExtensionService } from './extensions';
import { Logger } from 'winston';

export type ExtendedPrismaClientType = ReturnType<DatabaseService['createExtendedClient']>;

@Injectable()
export class DatabaseService {
  constructor(
    @Inject(CONFIG) private readonly appConfig: AppConfigType,
    @Inject(LOGGER_INJECTABLE_NAME) private readonly logger: Logger,
    private readonly prismaCacheExtensionService: PrismaCacheExtensionService
  ) {}

  public createExtendedClient() {
    return this.prismaCacheExtensionService.applyExtension(new PrismaClient()).$extends(existsExtension);
  }
}
