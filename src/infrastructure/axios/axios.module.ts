import { DynamicModule, Global, Module } from '@nestjs/common';
import { Logger } from 'winston';
import { LoggingModule } from '../logging/logging.module';
import { AxiosService } from './instance/axios.instance';
import { LOGGER_INJECTABLE_NAME, LOGGER_NAME } from './instance/axios.instance.config';
import { CreateCustomAxiosInstanceOptions } from './instance/axios.instance.dto';

@Global()
@Module({})
export class AxiosModule {
  static forRoot(options?: CreateCustomAxiosInstanceOptions): DynamicModule {
    return {
      module: AxiosModule,
      imports: [LoggingModule.forFeature(LOGGER_NAME)],
      providers: [
        {
          provide: LOGGER_NAME,
          useFactory: (logger: Logger) => {
            return new AxiosService(logger, options);
          },
          inject: [LOGGER_INJECTABLE_NAME],
        },
      ],
      exports: [LOGGER_NAME],
    };
  }

  static forFeature(options?: CreateCustomAxiosInstanceOptions): DynamicModule {
    return {
      module: AxiosModule,
      imports: [LoggingModule.forFeature(LOGGER_NAME)],
      providers: [
        {
          provide: LOGGER_NAME,
          useFactory: (logger: Logger) => {
            return new AxiosService(logger, options);
          },
          inject: [LOGGER_INJECTABLE_NAME],
        },
      ],
      exports: [LOGGER_NAME],
    };
  }
}
