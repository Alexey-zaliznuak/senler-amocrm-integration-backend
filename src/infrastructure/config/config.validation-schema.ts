import * as Joi from 'joi'


export enum NodeEnv {
  development = "development",
  production = "production",
  staging = "staging",
}


export const appConfigValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid(NodeEnv.development, NodeEnv.staging, NodeEnv.production)
    .required(),

  PORT: Joi.number().default(3000),

  DATABASE_URL: Joi.string().uri().required(),

  AMO_CRM_CLIENT_ID: Joi.string().required(),
  AMO_CRM_CLIENT_SECRET: Joi.string().required(),
  AMO_CRM_REDIRECT_URI: Joi.string().uri().required(),

  DEV_SERVER_URL: Joi.string().uri().required(),
  PROD_SERVER_URL: Joi.string().uri().required(),

  LOGSTASH_HOST: Joi.string().when('NODE_ENV', {
    not: NodeEnv.development,
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),

  LOGSTASH_PORT: Joi.number().when('NODE_ENV', {
    not: NodeEnv.development,
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
});
