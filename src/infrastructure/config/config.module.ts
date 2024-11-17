import { DynamicModule, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AppConfig, AppConfigType } from './config.app-config';


export const CONFIG = "CONFIG"


@Module({})
/**
 * Convenient access for config service.
 * You should inject it and use like:
 * 
 */
export class CustomConfigModule {
  static forRoot(): DynamicModule {
    return {
      module: CustomConfigModule,
      imports: [
        ConfigModule,
      ],
      providers: [
        {
          provide: CONFIG,
          useFactory: (config: ConfigService<AppConfigType>): AppConfigType => {
            return new Proxy(
              config,
              {
                get: (target: any, property: string) => {
                  if (property in target.internalConfig) {
                    return target.internalConfig[property];
                  }
                  return undefined
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
