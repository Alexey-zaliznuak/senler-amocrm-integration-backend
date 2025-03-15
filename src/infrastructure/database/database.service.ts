import { Injectable } from '@nestjs/common';
import { existsExtension, PrismaCacheExtensionService } from './extensions';
import { CustomPrismaClient } from './prisma.custom-client';

export type PrismaExtendedClientType = ReturnType<DatabaseService['createExtendedClient']>;

@Injectable()
export class DatabaseService {
  constructor(
    private readonly customPrismaClient: CustomPrismaClient,
    private readonly prismaCacheExtensionService: PrismaCacheExtensionService
  ) {}

  public createExtendedClient() {
    return this.prismaCacheExtensionService.applyExtension(this.customPrismaClient).$extends(existsExtension);
  }
}
