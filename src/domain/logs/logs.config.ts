import { AXIOS } from 'src/infrastructure/axios/instance';
import { LOGGER } from 'src/infrastructure/logging/logging.config';

export const LOGS = 'LogsResource';

export const LOGGER_INJECTABLE_NAME = LOGS + LOGGER;

export const AXIOS_INJECTABLE_NAME = LOGS + AXIOS;
