import { AxiosError } from 'axios';
import axiosRetry, { IAxiosRetryConfig } from 'axios-retry';
import { LoggingService } from 'src/infrastructure/logging/logging.service';

export const AXIOS = 'AxiosInstance';
export const LOGGER_INJECTABLE_NAME = LoggingService.buildInjectableNameByContext(AXIOS);

export const BASE_RETRY_CONFIG: IAxiosRetryConfig = {
  retries: 2,
  retryDelay: (retryCount: number) => {
    const randomFactor = 0.8 + Math.random() * 0.4;
    return 1000 * 2 ** retryCount * randomFactor;
  },
  retryCondition: (error: AxiosError<unknown, any>) => {
    const networkError = axiosRetry.isNetworkOrIdempotentRequestError(error);

    const statusCode5xx = error.response && error.response.status >= 500 && error.response.status < 600;
    const statusCode429 = error.response && error.response.status === 429;

    return statusCode5xx || statusCode429 || networkError;
  },
};
