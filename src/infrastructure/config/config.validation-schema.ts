import * as Joi from 'joi'


export enum NodeEnv {
  local = "local",
  development = "development",
  staging = "staging",
  production = "production",
}


const PORT_IF_MODE_NOT_LOCAL = Joi.number().when('NODE_ENV', {
  not: NodeEnv.local,
  then: Joi.required(),
  otherwise: Joi.optional(),
})


export const appConfigValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid(NodeEnv.development, NodeEnv.staging, NodeEnv.production)
    .required(),

  PORT: Joi.number().default(3000),

  INTEGRATION_SECRET: Joi.string().required(),

  DATABASE_URL: Joi.string().uri().required(),

  AMO_CRM_CLIENT_ID: Joi.string().required(),
  AMO_CRM_CLIENT_SECRET: Joi.string().required(),
  AMO_CRM_REDIRECT_URI: Joi.string().uri().required(),

  DEV_SERVER_URL: Joi.string().uri().required(),
  PROD_SERVER_URL: Joi.string().uri().required(),

  // ELK
  ELASTICSEARCH_HOST: PORT_IF_MODE_NOT_LOCAL,
  KIBANA_PORT: PORT_IF_MODE_NOT_LOCAL,
});
