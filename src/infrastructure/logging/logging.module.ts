import { DynamicModule, Global, Module } from '@nestjs/common';
import { LoggingService } from './logging.service';
import * as winston from 'winston';


export const LOGGER = 'WinstonLogger';


@Global()
@Module({
  providers: [LoggingService],
})
export class LoggingModule {
  static forRoot(options: winston.LoggerOptions): DynamicModule {
    const logger = LoggingService.createLogger(options);

    return {
      module: LoggingModule,
      providers: [
        {
          provide: LOGGER,
          useValue: logger,
        },
        LoggingService,
      ],
      exports: [LOGGER],
    };
  }
}
