import { DynamicModule, Module, Global, Inject } from '@nestjs/common';
import { AxiosService } from './instance/axios.instance';
import { AxiosRequestConfig } from 'axios';
import winston, { Logger } from 'winston';
import { LoggingService } from '../logging/logging.service';
import { CreateCustomAxiosInstanceOptions } from './instance/axios.instance.dto';
import { LOGGER, LoggingModule } from '../logging/logging.module';
import { AXIOS_INSTANCE, LOGGER_AXIOS_INSTANCE } from './instance/axios.instance.config';


@Global()
@Module({})
export class AxiosModule {
  static forRoot(options?: CreateCustomAxiosInstanceOptions): DynamicModule {
    return {
      module: AxiosModule,
      imports: [
        LoggingModule.forFeature("AxiosInstance"),
      ],
      providers: [
        {
          provide: AXIOS_INSTANCE,
          useFactory: (logger: Logger) => {
            return new AxiosService(logger, options);
          },
          inject: [LOGGER_AXIOS_INSTANCE],
        },
      ],
      exports: [AXIOS_INSTANCE],
    };
  }

  static forFeature(options: CreateCustomAxiosInstanceOptions): DynamicModule {
    return {
      module: AxiosModule,
      imports: [
        LoggingModule.forFeature("AxiosInstance"),
      ],
      providers: [
        {
          provide: AXIOS_INSTANCE,
          useFactory: (logger: Logger) => {
            return new AxiosService(logger, options);
          },
          inject: [LOGGER_AXIOS_INSTANCE],
        },
      ],
      exports: [AXIOS_INSTANCE],
    };
  }
}
