import * as Joi from 'joi'


export enum NodeEnv {
  development = "development",
  production = "production",
  staging = "staging",
}


const PORT_IF_NODE_DEVELOPMENT = Joi.number().when('NODE_ENV', {
  not: NodeEnv.development,
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
  ELASTIC_SEARCH_PORT: PORT_IF_NODE_DEVELOPMENT,

  LOGSTASH_HOST: Joi.string().when('NODE_ENV', {
    not: NodeEnv.development,
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
  LOGSTASH_API_HTTP_PORT: PORT_IF_NODE_DEVELOPMENT,
  LOGSTASH_INPUT_TCP_PORT: PORT_IF_NODE_DEVELOPMENT,

  KIBANA_PORT: PORT_IF_NODE_DEVELOPMENT,
});
