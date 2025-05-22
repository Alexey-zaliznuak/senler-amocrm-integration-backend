import * as winston from 'winston';
import * as Transport from 'winston-transport';
import { AppConfigType, NodeEnv } from '../config/config.app-config';

import path from 'path';

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

export const prettyLogStreamFormat = winston.format.printf(({ level, message, timestamp, context, ...meta }) => {
  const formattedMessage = typeof message === 'object' ? JSON.stringify(message, null, 4) : message;
  const formattedMeta = meta && Object.keys(meta) ? JSON.stringify(meta, null, 4) : '';

  return `${timestamp} [${context || 'Application'}] ${level}: ${formattedMessage} ${formattedMeta}`.slice(0, 2000); // TODO убрать
});

export const prettyLogStreamFormatWithColorsAndDatetime = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  prettyLogStreamFormat
);

export const baseTransports = (config: AppConfigType): Transport[] => [
  // new winston.transports.Console({
  //   level: 'debug',
  //   format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  // }),
  new winston.transports.Console({
    level: 'debug',
    format: prettyLogStreamFormatWithColorsAndDatetime,
  }),
  // config.NODE_ENV !== NodeEnv.production ? new winston.transports.File({
  //   level: 'debug',
  //   format: prettyLogStreamFormatWithColorsAndDatetime,
  //   filename: path.join('appLogs', new Date().toISOString().split('T')[0], 'log.log'),
  // }) : undefined,
];
