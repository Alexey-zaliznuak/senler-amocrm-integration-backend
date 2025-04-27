import { Inject, Injectable } from '@nestjs/common';
import axios, { AxiosError, AxiosInstance, AxiosRequestConfig, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import axiosRetry, { IAxiosRetryConfig } from 'axios-retry';
import { generateRequestId } from 'src/utils';
import { Logger } from 'winston';
import { AXIOS, BASE_RETRY_CONFIG, LOGGER_INJECTABLE_NAME } from './axios.instance.config';
import { CreateCustomAxiosInstanceOptions, CustomAxiosRequestConfig, RequestLoggerData } from './axios.instance.dto';

@Injectable()
export class CustomAxiosInstance {
  private readonly axios: AxiosInstance;
  private readonly defaults: CreateCustomAxiosInstanceOptions;

  private readonly requestLoggers = new Map<string, RequestLoggerData>();

  constructor(
    @Inject(LOGGER_INJECTABLE_NAME) private readonly logger: Logger,
    options: CreateCustomAxiosInstanceOptions = {}
  ) {
    this.defaults = {
      axiosConfig: options.axiosConfig,
      retryConfig: this.buildRetryConfig(options.retryConfig),
    };

    this.axios = this.createAxiosClient();

    this.setupInterceptors();
  }

  async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    const customConfig = this.setRequestId(config);

    this.setRequestLogger(url, customConfig);

    try {
      return await this.axios.get<T>(url, customConfig);
    } finally {
      this.deleteRequestLogger(customConfig.requestId);
    }
  }

  async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    const customConfig = this.setRequestId(config);

    this.setRequestLogger(url, customConfig);

    try {
      return await this.axios.post<T>(url, data, customConfig);
    } finally {
      this.deleteRequestLogger(customConfig.requestId);
    }
  }

  async postForm<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    const customConfig = this.setRequestId(config);

    this.setRequestLogger(url, customConfig);

    try {
      return await this.axios.postForm<T>(url, data, customConfig);
    } finally {
      this.deleteRequestLogger(customConfig.requestId);
    }
  }

  async patch<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    const customConfig = this.setRequestId(config);

    this.setRequestLogger(url, customConfig);

    try {
      return await this.axios.patch<T>(url, data, customConfig);
    } finally {
      this.deleteRequestLogger(customConfig.requestId);
    }
  }

  public static buildInjectableNameByContext = (context: string) => AXIOS + '__' + context;

  private createAxiosClient(): AxiosInstance {
    const instance = axios.create(this.defaults.axiosConfig);

    axiosRetry(instance, this.defaults.retryConfig);

    return instance;
  }

  private buildRetryConfig(axiosRetryConfig?: IAxiosRetryConfig): IAxiosRetryConfig {
    axiosRetryConfig = Object.assign(BASE_RETRY_CONFIG, axiosRetryConfig);
    axiosRetryConfig = this.appendLoggingOnRetry(axiosRetryConfig);

    return axiosRetryConfig;
  }

  private appendLoggingOnRetry(oldRetryConfig: IAxiosRetryConfig): IAxiosRetryConfig {
    return {
      ...oldRetryConfig,
      onRetry: async (retryCount: number, error: AxiosError, requestConfig: CustomAxiosRequestConfig): Promise<void> => {
        if (oldRetryConfig.onRetry) {
          await oldRetryConfig.onRetry(retryCount, error, requestConfig);
        }
        this.logRetrying(retryCount, error, requestConfig);
      },
    };
  }

  private setupInterceptors(): void {
    this.axios.interceptors.request.use(
      (config: InternalAxiosRequestConfig<any>) => {
        const logger = this.getRequestLogger((config as CustomAxiosRequestConfig).requestId || config?.data?.requestId);

        logger.info(`Sending request to ${config.url}`, {
          method: config.method,
          url: config.url,
          data: config.data,
          headers: config.headers,
        });

        return config;
      },

      (error: AxiosError) => {
        const config = error.config as CustomAxiosRequestConfig;

        const logger = config && this.getRequestLogger(config.requestId);

        if (logger) {
          logger.error(`Request error: ${error.message}`, { error });
        }

        return Promise.reject(error);
      }
    );

    this.axios.interceptors.response.use(
      (response: AxiosResponse) => {
        const config = response.config as CustomAxiosRequestConfig;
        const logger = this.getRequestLogger(config.requestId);
        logger.info(`Received response from ${config.url}`, {
          status: response.status,
          data: response.data,
        });
        return response;
      },

      (error: AxiosError) => {
        const config = error.config as CustomAxiosRequestConfig;
        const logger = config && this.getRequestLogger(config.requestId);
        if (logger) {
          logger.error(`Response error: ${error.message}`, {
            status: error.response?.status,
            data: error.response?.data,
          });
        }
        return Promise.reject(error);
      }
    );
  }

  private setRequestId(config: AxiosRequestConfig): AxiosRequestConfig & { requestId: string } {
    return { ...config, requestId: generateRequestId() };
  }

  private setRequestLogger(url: string, config: CustomAxiosRequestConfig): Logger {
    const logger = this.createChildRequestLogger(url, config.requestId);
    this.requestLoggers.set(config.requestId, {
      logger,
      createdAt: Date.now(),
    });
    return logger;
  }

  private getRequestLogger(requestId: string): Logger {
    const loggerData = this.requestLoggers.get(requestId);
    if (!loggerData) {
      throw new Error(`Logger not found for requestId: ${requestId}`);
    }
    return loggerData.logger;
  }

  private deleteRequestLogger(requestId: string): void {
    this.requestLoggers.delete(requestId);
  }

  private logRetrying(retryCount: number, error: AxiosError, requestConfig: CustomAxiosRequestConfig): void {
    const logger = this.getRequestLogger(requestConfig.requestId);
    logger.warn(`Request ${retryCount} attempt failed, error: ${error.message}`, { requestConfig });
  }

  private createChildRequestLogger(url: string, requestId: string): Logger {
    return this.logger.child({ url, requestId });
  }
}
