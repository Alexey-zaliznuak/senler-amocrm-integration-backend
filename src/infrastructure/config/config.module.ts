import { DynamicModule, Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

export const CONFIG = 'CONFIG';

/**
 * Convenient ACCESS for config service.
 * You should inject it and use like common object:
 * `@Inject(CONFIG) private readonly config: YourConfigType`
 *
 * ! This module DOES NOT LOAD CONFIG, only provides convenient access for ConfigService loaded.
 */
@Global()
@Module({})
export class CustomConfigModule {
  static forRoot(): DynamicModule {
    return {
      module: CustomConfigModule,
      imports: [ConfigModule],
      providers: [
        {
          provide: CONFIG,
          useFactory: (config: ConfigService) => {
            return new Proxy(config, {
              get: (target: any, property: string) => {
                if (property in target.internalConfig) {
                  return target.internalConfig[property];
                }
                return undefined;
              },
            });
          },
          inject: [ConfigService],
        },
      ],
      exports: [CONFIG],
    };
  }
}
