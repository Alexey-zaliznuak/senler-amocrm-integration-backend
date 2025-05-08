import { DynamicModule, Global, Module } from '@nestjs/common';
import { LoggingService } from './logging.service';
import * as winston from 'winston';
import { LOGGER } from './logging.config';

@Global()
@Module({
  providers: [LoggingService],
})
export class LoggingModule {
  static forRoot(options?: winston.LoggerOptions): DynamicModule {
    return {
      module: LoggingModule,
      providers: [
        {
          provide: LOGGER,
          inject: [LoggingService],
          useFactory: (loggingService: LoggingService) => {
            return loggingService.createLogger(options);
          },
        },
        LoggingService,
      ],
      exports: [LOGGER],
    };
  }

  static forFeature(context: string, options?: winston.LoggerOptions): DynamicModule {
    return {
      module: LoggingModule,
      providers: [
        {
          provide: context,
          inject: [LoggingService],
          useFactory: (loggingService: LoggingService) => {
            const logger = options
              ? loggingService.createLogger({
                  ...options,
                  defaultMeta: { context },
                })
              : loggingService.createLogger({ defaultMeta: { context } });

            return logger;
          },
        },
        LoggingService,
      ],
      exports: [context],
    };
  }
}
