import * as Joi from 'joi';


export enum NodeEnv {
  local = "local",
  development = "development",
  production = "production",
}

export const appConfigValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid(
      NodeEnv.local,
      NodeEnv.development,
      NodeEnv.production
    )
    .required(),
  PORT: Joi.number().default(3000),  // TODO

  INSTANCE_ID: Joi.string().default("1"),  // TODO

  INTEGRATION_SECRET: Joi.string().required(),

  DATABASE_URL: Joi.string().uri().required(),

  AMO_CRM_CLIENT_ID: Joi.string().required(),
  AMO_CRM_CLIENT_SECRET: Joi.string().required(),
  AMO_CRM_REDIRECT_URI: Joi.string().uri().required(),

  DEV_SERVER_URL: Joi.string().uri().required(),
  PROD_SERVER_URL: Joi.string().uri().required(),

  LOKI_HOST: Joi.string().uri().required(),
  LOKI_USERNAME: Joi.string().required(),
  LOKI_AUTH_TOKEN: Joi.string().required(),
});
