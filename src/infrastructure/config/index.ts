export * from './config.validation-schema'

export const AppConfig = () => ({
  PORT: parseInt(process.env.PORT, 10) || 3000,
  NODE_ENV: process.env.NODE_ENV,
  DEV_SERVER_URL: process.env.DEV_SERVER_URL,
  PROD_SERVER_URL: process.env.DEV_SERVER_URL,
  DATABASE_URL: process.env.DEV_SERVER_URL
});
