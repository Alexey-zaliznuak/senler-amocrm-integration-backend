import { DynamicModule, Module, Global, Inject } from '@nestjs/common';
import { AxiosService } from './instance/axios.instance';
import { AxiosRequestConfig } from 'axios';
import winston, { Logger } from 'winston';
import { LoggingService } from '../logging/logging.service';
import { CreateCustomAxiosInstanceOptions } from './instance/axios.instance.dto';
import { LOGGER } from '../logging/logging.module';

export const AXIOS_INSTANCE = "AxiosInstance";

@Global()
@Module({})
export class AxiosModule {
  static forRoot(options?: CreateCustomAxiosInstanceOptions): DynamicModule {
    return {
      module: AxiosModule,
      providers: [
        {
          provide: AXIOS_INSTANCE,
          useFactory: (logger: Logger) => {
            return new AxiosService(logger, options);
          },
          inject: [LOGGER],
        },
      ],
      exports: [AXIOS_INSTANCE],
    };
  }

  static forFeature(options: CreateCustomAxiosInstanceOptions): DynamicModule {
    return {
      module: AxiosModule,
      providers: [
        {
          provide: AXIOS_INSTANCE,
          useFactory: (logger: Logger) => {
            return new AxiosService(logger, options);
          },
          inject: [LOGGER],
        },
      ],
      exports: [AXIOS_INSTANCE],
    };
  }
}
