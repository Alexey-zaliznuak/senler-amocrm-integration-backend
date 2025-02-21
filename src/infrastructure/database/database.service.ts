import { Injectable, Inject } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { AppConfigType } from '../config/config.app-config';
import { CONFIG } from '../config/config.module';
import { LOGGER_INJECTABLE_NAME, PRISMA } from './database.config';
import { existsExtension, PrismaCacheExtensionService } from './extensions';
import { Logger } from 'winston';


export type ExtendedPrismaClientType = ReturnType<DatabaseService['createExtendedClient']>;


@Injectable()
export class DatabaseService {
  constructor(
    @Inject(CONFIG) private readonly appConfig: AppConfigType,
    @Inject(LOGGER_INJECTABLE_NAME) private readonly logger: Logger,
  ) {}

  public createExtendedClient() {
    return new PrismaCacheExtensionService(this.appConfig, this.logger)
      .applyExtension(new PrismaClient())
      .$extends(existsExtension);
  }
}
