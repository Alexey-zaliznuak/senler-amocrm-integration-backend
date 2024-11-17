import * as winston from 'winston';
import 'winston-daily-rotate-file';


const baseLogFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ level, message, timestamp, context, ...meta }) => {
    context = context || 'Application';

    const logObject = {
      level,
      message,
      timestamp,
      context,
      meta,
    }

    return JSON.stringify(logObject);
  })
);

const prettyLogPrintFormat = winston.format.printf(({ level, message, timestamp, context, ...meta }) => {
  const formattedMessage = typeof message === 'object' ? JSON.stringify(message, null, 4) : message;
  const formattedMeta = meta && Object.keys(meta) ? JSON.stringify(meta, null, 4) : ''

  return `${timestamp} [${context || 'Application'}] ${level}: ${formattedMessage} ${formattedMeta}`;
});

const prettyLogFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  prettyLogPrintFormat,
);

export const DEFAULT_LOGGING_OPTIONS: winston.LoggerOptions = {
  level: 'info',
  format: baseLogFormat,
  transports: [
    new winston.transports.Console({
      level: 'debug',
      format: prettyLogFormat,
    }),
    new winston.transports.DailyRotateFile({
      level: 'debug',
      format: prettyLogFormat,

      datePattern: 'YYYY-MM-DD',
      filename: 'logs/logs-pretty-%DATE%.log',

      maxSize: '50m',
      maxFiles: '14d',
      zippedArchive: true,
    }),
    new winston.transports.DailyRotateFile({
      level: 'debug',
      format: baseLogFormat,

      datePattern: 'YYYY-MM-DD',
      filename: 'logs/logs-%DATE%.log',

      maxSize: '50m',
      maxFiles: '14d',
      zippedArchive: true,
    }),
    // new (winston.transports as any).Logstash({
    //   port: logstashPort,
    //   host: logstashHost,
    //   applicationName: 'my-app', // Название приложения
    // }),
  ],
};
