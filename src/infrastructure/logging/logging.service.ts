import winston, { createLogger } from 'winston';
import { Injectable } from '@nestjs/common';
import { winstonOptions } from './logging.config';

@Injectable()
export class LoggingService {
    public static createLogger(options?: winston.LoggerOptions) {
        options = options ?? winstonOptions

        return createLogger(options)
    }
}
