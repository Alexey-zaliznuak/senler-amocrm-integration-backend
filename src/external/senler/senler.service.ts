import { Inject, Injectable, ServiceUnavailableException } from '@nestjs/common';
import * as crypto from 'crypto';
import { AXIOS, CustomAxiosInstance } from 'src/infrastructure/axios/instance';
import { LOGGER } from 'src/infrastructure/logging/logging.config';
import { Logger } from 'winston';

@Injectable()
export class SenlerService {
  private readonly maxAttempts = 5;

  private readonly baseUrl = 'https://senler.ru';
  private readonly callbackUrl = this.baseUrl + '/api/Integrations/Callback';

  constructor(
    @Inject(LOGGER) private readonly logger: Logger,
    @Inject(AXIOS) private readonly axios: CustomAxiosInstance
  ) {}

  async acceptWebhookRequest(params: {
    vk_user_id: string,
    vk_group_id: string,
    bot_callback: any,
    callback_key: string
    group_id: string;
  }): Promise<void> {
    const hash = this.generateHash(params, params.callback_key);
    await this.sendRequest({ url: this.callbackUrl, params: { ...params, hash } });
  }

  private async sendRequest(request: { url: string; params: any }): Promise<void> {
    try {
      await this.axios.postForm(request.url, request.params);
    } catch (exception) {
      this.logger.error('Request failed after max attempts', { exception });
      throw new ServiceUnavailableException('Max attempts reached');
    }
  }

  private generateHash(params: Record<string, unknown>, secret: string): string {
    const values = Object.values(params).join('');
    return crypto
      .createHash('md5')
      .update(values + secret)
      .digest('hex');
  }
}
