import * as winston from 'winston';
import * as Transport from 'winston-transport';
import { AppConfig, AppConfigType } from '../config/config.app-config';

import LokiTransport from 'winston-loki';

export const LOGGER = 'WinstonLogger';

export const baseLogFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ level, message, timestamp, context, ...meta }) => {
    context = context;

    const logObject = {
      level,
      message,
      timestamp,
      context,
      meta,
    };

    return JSON.stringify(logObject);
  })
);

export const prettyLogPrintFormat = winston.format.printf(({ level, message, timestamp, context, ...meta }) => {
  const formattedMessage = typeof message === 'object' ? JSON.stringify(message, null, 4) : message;
  const formattedMeta = meta && Object.keys(meta) ? JSON.stringify(meta, null, 4) : '';

  let logMessage = `${timestamp} [${context || 'Application'}] ${level}: ${formattedMessage} ${formattedMeta}`;
  logMessage =
    logMessage.length > AppConfig.MAX_CONSOLE_LOG_MESSAGE
      ? logMessage.substring(0, AppConfig.MAX_CONSOLE_LOG_MESSAGE) + '...'
      : logMessage;

  return logMessage;
});

export const prettyLogFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  prettyLogPrintFormat
);

export const baseTransports = (config: AppConfigType): Transport[] => [
  new winston.transports.Console({
    level: 'debug',
    format: prettyLogFormat,
  }),
  new LokiTransport({
    host: config.LOKI_HOST,
    labels: {
      service: config.INSTANCE_NAME,
      instance: config.INSTANCE_ID,
    },
    json: true,
    basicAuth: config.LOKI_USERNAME + ':' + config.LOKI_AUTH_TOKEN,
    format: winston.format.json(),
    replaceTimestamp: true,
    onConnectionError: err => {
      if (err) {
        console.error('Connection to Loki failed. Check your host and credentials.');
      }
    },
  }),
];
