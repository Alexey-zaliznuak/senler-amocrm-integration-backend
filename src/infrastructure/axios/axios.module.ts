import { DynamicModule, Global, Module } from '@nestjs/common';
import { Logger } from 'winston';
import { LoggingModule } from '../logging/logging.module';
import { AxiosService } from './instance/axios.instance';
import { LOGGER_INJECTABLE_NAME, AXIOS } from './instance/axios.instance.config';
import { CreateCustomAxiosInstanceOptions } from './instance/axios.instance.dto';

@Global()
@Module({})
export class AxiosModule {
  static forRoot(options?: CreateCustomAxiosInstanceOptions): DynamicModule {
    return {
      module: AxiosModule,
      imports: [LoggingModule.forFeature(AXIOS)],
      providers: [
        {
          provide: AXIOS,
          useFactory: (logger: Logger) => {
            return new AxiosService(logger, options);
          },
          inject: [LOGGER_INJECTABLE_NAME],
        },
      ],
      exports: [AXIOS],
    };
  }

  static forFeature(context?: string, options?: CreateCustomAxiosInstanceOptions): DynamicModule {
    return {
      module: AxiosModule,
      imports: [LoggingModule.forFeature(AXIOS)],
      providers: [
        {
          provide: context,
          useFactory: (logger: Logger) => {
            return new AxiosService(logger, options);
          },
          inject: [LOGGER_INJECTABLE_NAME],
        },
      ],
      exports: [context],
    };
  }
}
