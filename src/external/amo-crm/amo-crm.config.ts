import { AXIOS } from 'src/infrastructure/axios/instance';
import { LOGGER } from 'src/infrastructure/logging/logging.config';

export const AMO_CRM = 'AmoCrm';
export const AXIOS_INJECTABLE_NAME = AMO_CRM + AXIOS;
export const LOGGER_INJECTABLE_NAME = AMO_CRM + LOGGER;
