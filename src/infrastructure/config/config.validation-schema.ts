import * as Joi from 'joi'

export const appConfigValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'staging')
    .required(),

  PORT: Joi.number().default(3000),

  DATABASE_URL: Joi.string().uri().required(),

  AMO_CRM_CLIENT_ID: Joi.string().required(),
  AMO_CRM_CLIENT_SECRET: Joi.string().required(),
  AMO_CRM_REDIRECT_URI: Joi.string().uri().required(),

  DEV_SERVER_URL: Joi.string().uri().required(),
  PROD_SERVER_URL: Joi.string().uri().required(),
});
