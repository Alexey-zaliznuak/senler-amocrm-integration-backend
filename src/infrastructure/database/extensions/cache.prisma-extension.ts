import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
import { createClient, RedisClientType } from 'redis';
import { AppConfigType } from 'src/infrastructure/config/config.app-config';
import { CONFIG } from 'src/infrastructure/config/config.module';
import { Logger } from 'winston';
import { LOGGER_INJECTABLE_NAME } from '../database.config';

const PRISMA_OBJECTS_CACHE_PREFIX = 'cache:prisma:objectsByParams:';
const PRISMA_OBJECTS_PARAMS_VARIANTS_BY_ID_PREFIX = 'cache:prisma:objectParamsById:'; // For remove cache for object from any args

@Injectable()
export class PrismaCacheExtensionService implements OnModuleInit {
  public readonly client: RedisClientType;

  constructor(
    @Inject(CONFIG) private readonly appConfig: AppConfigType,
    @Inject(LOGGER_INJECTABLE_NAME) private readonly logger: Logger
  ) {
    this.client = createClient({ url: appConfig.CACHE_DATABASE_URL });
    this.client
      .on('error', e => this.logger.error('Cache error:', e))
      .on('connect', () => this.logger.debug('Connecting to KeyDb...'));
  }

  async onModuleInit() {
    const c = await this.client.connect();
    this.logger.debug('Cache database connected.');
  }

  public applyExtension(prisma: PrismaClient) {
    const serviceThis = this;

    const extension = Prisma.defineExtension({
      name: 'cacheExtension',
      model: {
        $allModels: {
          findFirstWithCache: async function <
            T,
            Args extends Prisma.Args<T, 'findFirst'>,
            Result = Prisma.Result<T, Args, 'findFirst'>
          >(
            this: T,
            args: Args
          ): Promise<Result> {
            const context = Prisma.getExtensionContext(this) as any;
            const model = context.$name;

            const cacheKey = serviceThis.buildObjectCacheKey(model, args);
            const cachedResult = await serviceThis.getCachedDataOrNull<Result>(cacheKey);

            if (cachedResult) return cachedResult;

            const result = await context(args);

            if (result) {
              await serviceThis.saveResultInCache(model, cacheKey, result);
            }

            return result;
          },

          findFirstOrThrowWithCache: async function <
            T,
            Args extends Prisma.Args<T, 'findFirstOrThrow'>,
            Result = Prisma.Result<T, Args, 'findFirstOrThrow'>
          >(
            this: T,
            args: Args
          ): Promise<Result> {
            const context = Prisma.getExtensionContext(this) as any;
            const model = context.$name;

            const cacheKey = serviceThis.buildObjectCacheKey(model, args);
            const cachedResult = await serviceThis.getCachedDataOrNull<Result>(cacheKey);

            if (cachedResult) return cachedResult;

            const result = await context.findFirstOrThrow(args);

            if (result) {
              await serviceThis.saveResultInCache(model, cacheKey, result);
            }

            return result;
          },

          findUniqueWithCache: async function <
            T,
            Args extends Prisma.Args<T, 'findUnique'>,
            Result = Prisma.Result<T, Args, 'findUnique'>
          >(
            this: T,
            args: Args
          ): Promise<Result> {
            const context = Prisma.getExtensionContext(this) as any;
            const model = context.$name;

            const cacheKey = serviceThis.buildObjectCacheKey(model, args);
            const cachedResult = await serviceThis.getCachedDataOrNull<Result>(cacheKey);

            if (cachedResult) return cachedResult;

            const result = await context.findUnique(args);

            if (result) {
              await serviceThis.saveResultInCache(model, cacheKey, result);
            }

            return result;
          },

          findUniqueOrThrowWithCache: async function <
            T,
            Args extends Prisma.Args<T, 'findUniqueOrThrow'>,
            Result = Prisma.Result<T, Args, 'findUniqueOrThrow'>
          >(
            this: T,
            args: Args
          ): Promise<Result> {
            const context = Prisma.getExtensionContext(this) as any;
            const model = context.$name;

            const cacheKey = serviceThis.buildObjectCacheKey(model, args);
            const cachedResult = await serviceThis.getCachedDataOrNull<R>(cacheKey);

            if (cachedResult) return cachedResult;

            const result = await context.findUniqueOrThrow(args);

            await serviceThis.saveResultInCache(model, cacheKey, result);

            return result;
          },

          updateWithCacheInvalidate: async function <
            T,
            Args extends Prisma.Args<T, 'update'>,
            Result = Prisma.Result<T, Args, 'update'>
          >(
            this: T,
            args: Args
          ): Promise<Result> {
            const context = Prisma.getExtensionContext(this) as any;
            const model = context.$name;

            const result = await context.update(args);

            if (result?.id) {
              await serviceThis.invalidateCache(model, result.id);
            }

            return result;
          },

          upsertWithCacheInvalidate: async function <
            T,
            Args extends Prisma.Args<T, 'upsert'>,
            Result = Prisma.Result<T, Args, 'upsert'>
          >(
            this: T,
            args: Args
          ): Promise<Result> {
            const context = Prisma.getExtensionContext(this) as any;
            const model = context.$name;

            const result = await context.upsert(args);

            if (result?.id) {
              await serviceThis.invalidateCache(model, result.id);
            }
            return result;
          },

          deleteWithCacheInvalidate: async function <
            T,
            Args extends Prisma.Args<T, 'delete'>,
            Result = Prisma.Result<T, Args, 'delete'>
          >(
            this: T,
            args: Args
          ): Promise<Result> {
            const context = Prisma.getExtensionContext(this) as any;
            const model = context.$name;

            const result = await context.delete(args);

            if (result?.id) {
              await serviceThis.invalidateCache(model, result.id);
            }
            return result;
          },

          invalidateCache: async function <T>(this: T, objectIds: string | string[]): Promise<void> {
            const context = Prisma.getExtensionContext(this) as any;
            const model = context.$name;

            await serviceThis.invalidateCache(model, objectIds);
          },
        },
      },
    });

    return prisma.$extends(extension);
  }

  async invalidateCache(model: string, objectIds: string | string[]) {
    try {
      objectIds = Array.isArray(objectIds) ? objectIds : [objectIds];
      const keysToRemove: string[] = [];

      const promisesForEveryObject = objectIds.map(async id => {
        const indexKey = this.buildIndexCacheKey(model, id);
        const cacheKeys = await this.client.sMembers(indexKey);

        return [...cacheKeys, indexKey];
      });

      const results = await Promise.all(promisesForEveryObject);

      for (const keys of results) {
        keysToRemove.push(...keys);
      }

      if (keysToRemove.length > 0) {
        await this.client.del(keysToRemove);
      }
    } catch (error) {
      this.logger.error('Cache invalidation error:', error);
    }
  }

  private async saveResultInCache(model: string, cacheKey: string, result: any) {
    try {
      const ttl = this.appConfig.CACHE_SPECIFIC_TTL[model] || this.appConfig.CACHE_DEFAULT_TTL;

      if (result === null) {
        await this.client.setEx(cacheKey, this.appConfig.CACHE_NULL_RESULT_TTL, null);
        return;
      }

      const indexKey = this.buildIndexCacheKey(model, result.id);

      const multi = this.client
        .multi()
        .setEx(cacheKey, ttl, JSON.stringify(result))
        .sAdd(indexKey, cacheKey)
        .expire(indexKey, ttl);

      await multi.exec();
    } catch (error) {
      this.logger.error('Save cache error:', { error });
    }
  }

  private async getCachedDataOrNull<T>(cacheKey: string): Promise<T | null> {
    try {
      const cachedData = await this.client.get(cacheKey);
      return cachedData ? JSON.parse(cachedData) : null;
    } catch (error) {
      this.logger.error('Cache read error:', error);
      return null;
    }
  }

  buildObjectCacheKey(model: string, params: any): string {
    const sortedParams = Object.keys(params)
      .sort()
      .reduce((acc, key) => ({ ...acc, [key]: params[key] }), {});

    return `${PRISMA_OBJECTS_CACHE_PREFIX}${model}:${JSON.stringify(sortedParams)}`;
  }

  buildIndexCacheKey(model: string, recordId: string): string {
    return `${PRISMA_OBJECTS_PARAMS_VARIANTS_BY_ID_PREFIX}${model}:${recordId}`;
  }
}
