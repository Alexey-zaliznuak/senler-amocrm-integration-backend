import { Logger } from 'winston';
import { Inject, Injectable, OnModuleDestroy } from '@nestjs/common';
import axios, { AxiosError, AxiosInstance, AxiosRequestConfig, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import axiosRetry, { IAxiosRetryConfig } from 'axios-retry';
import { CreateCustomAxiosInstanceOptions } from './axios.instance.dto';
import { BASE_RETRY_CONFIG } from './axios.instance.config';
import { timeToMilliseconds } from 'src/utils';

export interface CustomAxiosRequestConfig extends AxiosRequestConfig {
  requestId: string;
};

interface RequestLoggerData {
  logger: Logger;
  createdAt: number;
}

@Injectable()
export class AxiosService implements OnModuleDestroy {
  private readonly axios: AxiosInstance;
  private readonly defaults: CreateCustomAxiosInstanceOptions;

  private readonly requestLoggers = new Map<string, RequestLoggerData>();
  private readonly maxLoggerAge = timeToMilliseconds({minutes: 5});
  private readonly cleanupInterval = timeToMilliseconds({minutes: 10});

  private cleanupTimer: NodeJS.Timeout;


  constructor(
    @Inject("LOGGER") private readonly logger: Logger,
    options: CreateCustomAxiosInstanceOptions = {},
  ) {
    this.defaults = {
      axiosConfig: options.axiosConfig,
      retryConfig: this.buildRetryConfig(options.retryConfig),
    };

    this.axios = this.createAxiosClient();

    this.startCleanupTask();
    this.setupInterceptors()
  }

  async get<T>(url: string, config?: CustomAxiosRequestConfig): Promise<AxiosResponse<T>> {
    this.setRequestLogger(url, config);

    try {
      return await this.axios.get<T>(url, config);
    }
    finally {
      this.deleteRequestLogger(config.requestId);
    }
  }

  async post<T>(url: string, data?: any, config?: CustomAxiosRequestConfig): Promise<AxiosResponse<T>> {
    this.setRequestLogger(url, config);

    try {
      return await this.axios.post<T>(url, data, config);
    }
    finally {
      this.deleteRequestLogger(config.requestId);
    }
  }

  private createAxiosClient(): AxiosInstance {
    this.logger.debug('Create axios client:', {
      axiosConfig: this.defaults.axiosConfig,
      axiosRetryConfig: this.defaults.retryConfig,
    });

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
        if (oldRetryConfig.onRetry) await oldRetryConfig.onRetry(retryCount, error, requestConfig);
        this.logRetrying(retryCount, error, requestConfig);
      },
    };
  }

  private setupInterceptors(): void {
    this.axios.interceptors.request.use(
      (config: InternalAxiosRequestConfig<any>) => {
        const logger = this.getRequestLogger((config as CustomAxiosRequestConfig).requestId);

        logger.info(`Sending request to ${config.url}`, { method: config.method, url: config.url, data: config.data });

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
        logger.info(`Received response from ${config.url}`, { status: response.status, data: response.data });
        return response;
      },

      (error: AxiosError) => {
        const config = error.config as CustomAxiosRequestConfig;
        const logger = config && this.getRequestLogger(config.requestId);
        if (logger) {
          logger.error(`Response error: ${error.message}`, { status: error.response?.status, data: error.response?.data });
        }
        return Promise.reject(error);
      }
    );
  }

  private setRequestLogger(url: string, config: CustomAxiosRequestConfig): Logger {
    const logger = this.createChildRequestLogger(url, config.requestId);
    this.requestLoggers.set(config.requestId, { logger, createdAt: Date.now() });
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

  private startCleanupTask(): void {
    this.cleanupTimer = setInterval(() => {
      const now = Date.now();
      this.requestLoggers.forEach((data, requestId) => {
        if (now - data.createdAt > this.maxLoggerAge) {
          this.requestLoggers.delete(requestId);
        }
      });
    }, this.cleanupInterval);
  }

  onModuleDestroy() {
    if (this.cleanupTimer) {
      this.logger.debug("Clear timer interval.")
      clearInterval(this.cleanupTimer);
    }
  }
}
