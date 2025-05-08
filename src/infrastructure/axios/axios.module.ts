import { DynamicModule, Global, Module } from '@nestjs/common';
import { Logger } from 'winston';
import { LoggingModule } from '../logging/logging.module';
import { AxiosService } from './axios.service';
import { CustomAxiosInstance } from './instance/axios.instance';
import { AXIOS, LOGGER_INJECTABLE_NAME } from './instance/axios.instance.config';
import { CreateCustomAxiosInstanceOptions } from './instance/axios.instance.dto';

@Global()
@Module({
  providers: [AxiosService],
})
export class AxiosModule {
  static forRoot(options?: CreateCustomAxiosInstanceOptions): DynamicModule {
    return {
      module: AxiosModule,
      imports: [LoggingModule.forFeature(LOGGER_INJECTABLE_NAME)],
      providers: [
        {
          provide: AXIOS,
          useFactory: (logger: Logger) => {
            return new CustomAxiosInstance(logger, options);
          },
          inject: [LOGGER_INJECTABLE_NAME],
        },
      ],
      exports: [AXIOS],
    };
  }

  static forFeature(context?: string, options?: CreateCustomAxiosInstanceOptions): DynamicModule {
    const loggerInjectableName = `${context ?? 'Application'}[${AXIOS}]`;
    return {
      module: AxiosModule,
      imports: [LoggingModule.forFeature(loggerInjectableName)],
      providers: [
        {
          provide: context,
          useFactory: (logger: Logger) => {
            return new CustomAxiosInstance(logger, options);
          },
          inject: [loggerInjectableName],
        },
      ],
      exports: [context],
    };
  }
}
