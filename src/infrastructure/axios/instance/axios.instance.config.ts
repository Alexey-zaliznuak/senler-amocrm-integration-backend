import { AxiosError, CreateAxiosDefaults } from "axios";
import axiosRetry, { IAxiosRetryConfig } from "axios-retry";
import { LOGGER } from "src/infrastructure/logging/logging.module";

export const BASE_RETRY_CONFIG = {
  retries: 5,
  retryDelay: (retryCount: number) => {
    const randomFactor = 0.8 + Math.random() * 0.4;
    return 1000 * (2 ** retryCount) * randomFactor
  },
  retryCondition: (error: AxiosError<unknown, any>) => {
    const networkError = axiosRetry.isNetworkOrIdempotentRequestError(error);

    const statusCode5xx = error.response && error.response.status >= 500 && error.response.status < 600;
    const statusCode429 = error.response && error.response.status === 429;

    const isENOTFOUND = error.code === 'ENOTFOUND';
    return statusCode5xx || statusCode429 || networkError || isENOTFOUND;
  }
}

// Injects
export const AXIOS_INSTANCE = "AxiosInstance";
export const LOGGER_AXIOS_INSTANCE = LOGGER + "_" + AXIOS_INSTANCE
