import { DynamicModule, Module } from '@nestjs/common';
import { CacheService } from './cache.service';

@Module({
  providers: [CacheService]
})
export class CacheModule {
  static forFeature(context?: string, ): DynamicModule {
    return {
      module: CacheModule,
      imports: [],
      providers: [
        {
          provide: context,
          useFactory: () => {
            return 1;
          },
          inject: [],
        },
      ],
      exports: [context],
    };
  }
}
