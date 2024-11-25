export * from './config.validation-schema'


export const AppConfig = {
  NODE_ENV: process.env.NODE_ENV,
  INTEGRATION_SECRET: process.env.INTEGRATION_SECRET,

  PORT: parseInt(process.env.PORT, 10) || 3000,

  DATABASE_URL: process.env.DEV_SERVER_URL,

  AMO_CRM_CLIENT_ID: process.env.AMO_CRM_CLIENT_ID,
  AMO_CRM_CLIENT_SECRET: process.env.AMO_CRM_CLIENT_SECRET,
  AMO_CRM_REDIRECT_URI: process.env.AMO_CRM_REDIRECT_URI,

  DEV_SERVER_URL: process.env.DEV_SERVER_URL,
  PROD_SERVER_URL: process.env.DEV_SERVER_URL,

  ELASTICSEARCH_HOST: process.env.ELASTICSEARCH_HOST,
  KIBANA_PORT: process.env.KIBANA_PORT,

  ELASTIC_PASSWORD: process.env.ELASTIC_PASSWORD,
  ELASTIC_USERNAME: process.env.ELASTIC_USERNAME,
};


export type AppConfigType = typeof AppConfig;
