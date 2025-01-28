import { AxiosRequestConfig } from 'axios';
import { IAxiosRetryConfig } from 'axios-retry';
import { Logger } from 'winston';

export type CreateCustomAxiosInstanceOptions = {
  axiosConfig?: AxiosRequestConfig;
  retryConfig?: IAxiosRetryConfig;
};

export interface CustomAxiosRequestConfig extends AxiosRequestConfig {
  requestId: string;
}

export interface RequestLoggerData {
  logger: Logger;
  createdAt: number;
}
