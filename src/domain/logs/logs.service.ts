import { Inject, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { AxiosService } from 'src/infrastructure/axios/axios.service';
import { CustomAxiosInstance } from 'src/infrastructure/axios/instance';
import { AppConfigType } from 'src/infrastructure/config/config.app-config';
import { CONFIG } from 'src/infrastructure/config/config.module';
import { Logger } from 'winston';
import { AXIOS_INJECTABLE_NAME, LOGGING_INJECTABLE_NAME } from './logs.config';

@Injectable()
export class LogsService {
  private readonly auth: { username: string; password: string };

  constructor(
    @Inject(CONFIG) private readonly appConfig: AppConfigType,
    @Inject(AXIOS_INJECTABLE_NAME) private readonly axios: CustomAxiosInstance,
    @Inject(LOGGING_INJECTABLE_NAME) private readonly logger: Logger
  ) {
    this.auth = { username: this.appConfig.LOKI_USERNAME, password: this.appConfig.LOKI_AUTH_TOKEN };
  }
}
