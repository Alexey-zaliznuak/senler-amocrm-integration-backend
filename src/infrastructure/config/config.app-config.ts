import { config } from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import { level } from 'winston';

config();

export enum NodeEnv {
  local = 'local',
  development = 'development',
  production = 'production',
}

export const AppConfig = {
  NODE_ENV: process.env.NODE_ENV || NodeEnv.local,
  PORT: parseInt(process.env.PORT) || 3000,

  MICROSERVICE_NAME: process.env.MICROSERVICE_NAME || 'senler_amo_crm',
  INSTANCE_ID: process.env.INSTANCE_ID || uuidv4(),

  INTEGRATION_SECRET: process.env.INTEGRATION_SECRET,

  STREAM_LOGGING_LEVEL: process.env.STREAM_LOGGING_LEVEL || 'info',
  MAX_CONSOLE_LOG_MESSAGE: parseInt(process.env.MAX_CONSOLE_LOG_MESSAGE) || 2000,

  DATABASE_URL: process.env.DEV_SERVER_URL,

  CACHE_DATABASE_URL: process.env.CACHE_DATABASE_URL,
  CACHE_DEFAULT_TTL: parseInt(process.env.CACHE_DEFAULT_TTL),
  CACHE_SPECIFIC_TTL: {
    SenlerGroup: parseInt(process.env.SENLER_GROUP_CACHE_TTL),
    Lead: parseInt(process.env.LEAD_CACHE_TTL),
  },
  CACHE_NULL_RESULT_TTL: parseInt(process.env.CACHE_NULL_RESULT_TTL),

  AMO_CRM_CLIENT_ID: process.env.AMO_CRM_CLIENT_ID,
  AMO_CRM_CLIENT_SECRET: process.env.AMO_CRM_CLIENT_SECRET,
  AMO_CRM_REDIRECT_URI: process.env.AMO_CRM_REDIRECT_URI,

  LOKI_HOST: process.env.LOKI_HOST,
  LOKI_USERNAME: process.env.LOKI_USERNAME,
  LOKI_AUTH_TOKEN: process.env.LOKI_AUTH_TOKEN,
};

export type AppConfigType = typeof AppConfig;
