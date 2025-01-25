import { Logger } from 'winston';
import { Inject, Injectable, OnModuleDestroy } from '@nestjs/common';
import axios, { AxiosError, AxiosInstance, AxiosRequestConfig, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import axiosRetry, { IAxiosRetryConfig } from 'axios-retry';
import { CreateCustomAxiosInstanceOptions, CustomAxiosRequestConfig, RequestLoggerData } from './axios.instance.dto';
import { AXIOS_INSTANCE_LOGGER, BASE_RETRY_CONFIG } from './axios.instance.config';
import { timeToMilliseconds } from 'src/utils';

@Injectable()
export class AxiosService implements OnModuleDestroy {
  private readonly axios: AxiosInstance;
  private readonly defaults: CreateCustomAxiosInstanceOptions;

  private readonly requestLoggers = new Map<string, RequestLoggerData>();
  private readonly maxLoggerAge = timeToMilliseconds({ minutes: 5 });
  private readonly cleanupInterval = timeToMilliseconds({ minutes: 10 });

  private cleanupTimer: NodeJS.Timeout;

  constructor(
    @Inject(AXIOS_INSTANCE_LOGGER) private readonly logger: Logger,
    options: CreateCustomAxiosInstanceOptions = {}
  ) {
    this.defaults = {
      axiosConfig: options.axiosConfig,
      retryConfig: this.buildRetryConfig(options.retryConfig),
    };

    this.axios = this.createAxiosClient();

    this.startCleanupTask();
    this.setupInterceptors();
  }

  async get<T>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    const customConfig = this.setRequestId(config);

    const logger = this.setRequestLogger(url, customConfig);

    try {
      return await this.axios.get<T>(url, customConfig);
    } finally {
      this.deleteRequestLogger(customConfig.requestId);
    }
  }

  async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    const customConfig = this.setRequestId(config);

    const logger = this.setRequestLogger(url, customConfig);

    try {
      const response = await this.axios.post<T>(url, data, customConfig);

      logger.debug("Axios response received: ", response)

      return response
    } finally {
      this.deleteRequestLogger(customConfig.requestId);
    }
  }

  async patch<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    const customConfig = this.setRequestId(config);

    const logger = this.setRequestLogger(url, customConfig);

    try {
      const response = await this.axios.patch<T>(url, data, customConfig);

      logger.debug("Axios response received: ", response)

      return response
    } finally {
      this.deleteRequestLogger(customConfig.requestId);
    }
  }

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
        if (oldRetryConfig.onRetry) await oldRetryConfig.onRetry(retryCount, error, requestConfig);
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
    return { ...config, requestId: this.generateRequestId() };
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

  private generateRequestId = (): string => Math.random().toString(16).slice(2);

  onModuleDestroy() {
    if (this.cleanupTimer) {
      this.logger.debug('Clear timer interval.');
      clearInterval(this.cleanupTimer);
    }
  }
}
