import * as Joi from 'joi';

import { AppConfig, NodeEnv } from './config.app-config';

export const appConfigValidationSchema = Joi.object({
  NODE_ENV: Joi.string().valid(NodeEnv.local, NodeEnv.development, NodeEnv.production).required(),
  PORT: Joi.number().default(AppConfig.PORT),

  INSTANCE_NAME: Joi.string().default('senler-amocrm-integration-backend'),
  INSTANCE_ID: Joi.string().default(AppConfig.INSTANCE_ID),

  INTEGRATION_SECRET: Joi.string().required(),

  DATABASE_URL: Joi.string().uri().required(),

  CACHE_DATABASE_URL: Joi.string().uri().required(),
  CACHE_DEFAULT_TTL: Joi.number().required(),

  SENLER_GROUP_CACHE_TTL: Joi.number().required(),
  LEAD_CACHE_TTL: Joi.number().required(),

  MAX_CONSOLE_LOG_MESSAGE: Joi.number().default(AppConfig.MAX_CONSOLE_LOG_MESSAGE),

  AMO_CRM_CLIENT_ID: Joi.string().required(),
  AMO_CRM_CLIENT_SECRET: Joi.string().required(),
  AMO_CRM_REDIRECT_URI: Joi.string().uri().required(),

  LOKI_HOST: Joi.string().uri().required(),
  LOKI_USERNAME: Joi.string().required(),
  LOKI_AUTH_TOKEN: Joi.string().required(),
});
