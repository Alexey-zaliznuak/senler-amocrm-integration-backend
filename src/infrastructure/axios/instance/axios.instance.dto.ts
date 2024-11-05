import { AxiosRequestConfig } from "axios";
import { IAxiosRetryConfig } from "axios-retry";

export type CreateCustomAxiosInstanceOptions = {
  axiosConfig: AxiosRequestConfig,
  retryConfig: IAxiosRetryConfig,
}

export interface CustomAxiosRequestConfig extends AxiosRequestConfig {
  requestId: string;
}
