export * from './config.validation-schema';

import { v4 as uuidv4 } from 'uuid';
import { NodeEnv } from './config.validation-schema';


export const AppConfig = {
  NODE_ENV: process.env.NODE_ENV || NodeEnv.local,

  INSTANCE_ID: process.env.INSTANCE_ID || uuidv4(),

  INTEGRATION_SECRET: process.env.INTEGRATION_SECRET,  // TODO

  PORT: parseInt(process.env.PORT, 10) || 3000,

  DATABASE_URL: process.env.DEV_SERVER_URL,

  AMO_CRM_CLIENT_ID: process.env.AMO_CRM_CLIENT_ID,
  AMO_CRM_CLIENT_SECRET: process.env.AMO_CRM_CLIENT_SECRET,
  AMO_CRM_REDIRECT_URI: process.env.AMO_CRM_REDIRECT_URI,

  // TODO OPENAPI SERVER ID`S
  DEV_SERVER_URL: process.env.DEV_SERVER_URL,
  PROD_SERVER_URL: process.env.DEV_SERVER_URL,

  LOKI_HOST: process.env.LOKI_HOST,
  LOKI_USERNAME: process.env.LOKI_USERNAME,
  LOKI_AUTH_TOKEN: process.env.LOKI_AUTH_TOKEN,
};


export type AppConfigType = typeof AppConfig;

