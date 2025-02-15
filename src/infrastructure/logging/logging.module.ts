import { DynamicModule, Global, Module } from '@nestjs/common';
import { LoggingService } from './logging.service';
import * as winston from 'winston';

export const LOGGER = 'WinstonLogger';

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
    const featureLoggerProvider = LoggingService.buildInjectableNameByContext(context);
    return {
      module: LoggingModule,
      providers: [
        {
          provide: featureLoggerProvider,
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
      exports: [featureLoggerProvider],
    };
  }
}
