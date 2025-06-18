import * as Joi from 'joi';

import { AppConfig, NodeEnv } from './config.app-config';

export const appConfigValidationSchema = Joi.object({
  NODE_ENV: Joi.string().valid(NodeEnv.local, NodeEnv.development, NodeEnv.production).required(),
  PORT: Joi.number().default(AppConfig.PORT),

  MICROSERVICE_NAME: Joi.string().default(AppConfig.MICROSERVICE_NAME),

  INTEGRATION_SECRET: Joi.string().required(),

  DATABASE_URL: Joi.string().uri().required(),

  RABBITMQ_URL: Joi.string().uri().required(),
  RABBITMQ_PREFETCH_COUNT: Joi.number().required(),
  RABBITMQ_TRANSFER_EXCHANGE: Joi.string().required(),
  RABBITMQ_TRANSFER_DELAYED_EXCHANGE: Joi.string().required(),
  RABBITMQ_TRANSFER_QUEUE: Joi.string().required(),
  RABBITMQ_TRANSFER_ROUTING_KEY: Joi.string().required(),

  TRANSFER_MESSAGE_MAX_RETRY_DELAY: Joi.number().required(),
  TRANSFER_MESSAGE_BASE_RETRY_DELAY: Joi.number().required(),

  CACHE_DATABASE_URL: Joi.string().uri().required(),
  CACHE_DEFAULT_TTL: Joi.number().required(),

  CACHE_NULL_RESULT_TTL: Joi.number().required(),

  AMO_CRM_CLIENT_ID: Joi.string().required(),
  AMO_CRM_CLIENT_SECRET: Joi.string().required(),
  AMO_CRM_REDIRECT_URI: Joi.string().uri().required(),

  SENLER_CLIENT_ID: Joi.string().required(),
  SENLER_CLIENT_SECRET: Joi.string().required(),
  SENLER_REDIRECT_URI: Joi.string().uri().required(),
});
