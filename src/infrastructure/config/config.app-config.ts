import { config } from 'dotenv';
import { v4 as uuidv4 } from 'uuid';

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

  DATABASE_URL: process.env.DEV_SERVER_URL,

  RABBITMQ_URL: process.env.RABBITMQ_URL,
  RABBITMQ_TRANSFER_EXCHANGE: process.env.RABBITMQ_TRANSFER_EXCHANGE,
  RABBITMQ_TRANSFER_DELAYED_EXCHANGE: process.env.RABBITMQ_TRANSFER_DELAYED_EXCHANGE,
  RABBITMQ_TRANSFER_QUEUE: process.env.RABBITMQ_TRANSFER_QUEUE,
  RABBITMQ_TRANSFER_ROUTING_KEY: process.env.RABBITMQ_TRANSFER_ROUTING_KEY,

  TRANSFER_MESSAGE_MAX_RETRY_DELAY: parseInt(process.env.TRANSFER_MESSAGE_MAX_RETRY_DELAY) || 86_400, // 1 day
  TRANSFER_MESSAGE_RETRY_DELAY_BASE: parseInt(process.env.TRANSFER_MESSAGE_DELAY_BASE) || 1000, // 1 second

  CACHE_DATABASE_URL: process.env.CACHE_DATABASE_URL,
  CACHE_DEFAULT_TTL: parseInt(process.env.CACHE_DEFAULT_TTL),
  CACHE_SPECIFIC_TTL: {
    SenlerGroup: parseInt(process.env.SENLER_GROUP_CACHE_TTL) || parseInt(process.env.CACHE_DEFAULT_TTL),
    Lead: parseInt(process.env.LEAD_CACHE_TTL) || parseInt(process.env.CACHE_DEFAULT_TTL),
  },
  CACHE_NULL_RESULT_TTL: parseInt(process.env.CACHE_NULL_RESULT_TTL),

  AMO_CRM_CLIENT_ID: process.env.AMO_CRM_CLIENT_ID,
  AMO_CRM_CLIENT_SECRET: process.env.AMO_CRM_CLIENT_SECRET,
  AMO_CRM_REDIRECT_URI: process.env.AMO_CRM_REDIRECT_URI,
};

export type AppConfigType = typeof AppConfig;
