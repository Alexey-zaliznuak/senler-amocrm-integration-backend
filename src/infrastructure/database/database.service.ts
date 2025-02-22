import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { existsExtension, PrismaCacheExtensionService } from './extensions';

export type ExtendedPrismaClientType = ReturnType<DatabaseService['createExtendedClient']>;

@Injectable()
export class DatabaseService {
  constructor(
    private readonly prismaCacheExtensionService: PrismaCacheExtensionService
  ) {}

  public createExtendedClient() {
    return this.prismaCacheExtensionService.applyExtension(new PrismaClient()).$extends(existsExtension);
  }
}
