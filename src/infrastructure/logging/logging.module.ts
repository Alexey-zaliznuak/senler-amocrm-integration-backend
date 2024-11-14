import { DEFAULT_LOGGING_OPTIONS } from './logging.config';
import { DynamicModule, Global, Module } from '@nestjs/common';
import { LoggingService } from './logging.service';
import * as winston from 'winston';


export const LOGGER = 'WinstonLogger';


@Global()
@Module({
  providers: [LoggingService],
})
export class LoggingModule {
  static forRoot(options: winston.LoggerOptions = DEFAULT_LOGGING_OPTIONS): DynamicModule {
    const logger = LoggingService.createLogger(options);

    const rootLoggerProvider = {
      provide: LOGGER,
      useValue: logger,
    };

    return {
      module: LoggingModule,
      providers: [rootLoggerProvider, LoggingService,],
      exports: [LOGGER],
    };
  }

  static forFeature(context: string, options: winston.LoggerOptions = DEFAULT_LOGGING_OPTIONS): DynamicModule {
    const logger = options
      ? LoggingService.createLogger({ ...options, defaultMeta: { context } })
      : LoggingService.createLogger({ defaultMeta: { context } });

    const featureLoggerProvider = {
      provide: LoggingService.buildInjectableNameByContext(context),
      useValue: logger,
    };

    return {
      module: LoggingModule,
      providers: [featureLoggerProvider, LoggingService],
      exports: [featureLoggerProvider],
    };
  }
}
