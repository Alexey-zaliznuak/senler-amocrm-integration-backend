import { DynamicModule, Module, Global } from '@nestjs/common';
import { AxiosService } from './instance/axios.instance';
import { Logger } from 'winston';
import { CreateCustomAxiosInstanceOptions } from './instance/axios.instance.dto';
import { LoggingModule } from '../logging/logging.module';
import {
  AXIOS_INSTANCE,
  AXIOS_INSTANCE_LOGGER,
} from './instance/axios.instance.config';

@Global()
@Module({})
export class AxiosModule {
  static forRoot(options?: CreateCustomAxiosInstanceOptions): DynamicModule {
    return {
      module: AxiosModule,
      imports: [LoggingModule.forFeature(AXIOS_INSTANCE)],
      providers: [
        {
          provide: AXIOS_INSTANCE,
          useFactory: (logger: Logger) => {
            return new AxiosService(logger, options);
          },
          inject: [AXIOS_INSTANCE_LOGGER],
        },
      ],
      exports: [AXIOS_INSTANCE],
    };
  }

  static forFeature(options?: CreateCustomAxiosInstanceOptions): DynamicModule {
    return {
      module: AxiosModule,
      imports: [LoggingModule.forFeature(AXIOS_INSTANCE)],
      providers: [
        {
          provide: AXIOS_INSTANCE,
          useFactory: (logger: Logger) => {
            return new AxiosService(logger, options);
          },
          inject: [AXIOS_INSTANCE_LOGGER],
        },
      ],
      exports: [AXIOS_INSTANCE],
    };
  }
}
