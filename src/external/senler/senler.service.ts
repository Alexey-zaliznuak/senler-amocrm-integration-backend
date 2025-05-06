import { Inject, Injectable, ServiceUnavailableException } from '@nestjs/common';
import * as crypto from 'crypto';
import { BotStepWebhookDto } from 'src/domain/integration/integration.dto';
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

  async acceptWebhookRequest(body: BotStepWebhookDto): Promise<void> {
    this.logger.info('Секретный ключ интеграции: ' + body.integrationSecret);

    const hash = this.generateHash(body.botCallback, body.integrationSecret);

    let { group_id, ...rest } = body.botCallback;

    await this.sendRequest({
      url: this.callbackUrl,
      params: { hash, group_id: body.botCallback.group_id, bot_callback: rest },
    });
  }

  private generateHash(body: BotStepWebhookDto['botCallback'], secret: string) {
    this.logger.info(`Тело для хеша:`, body);
    let values = [body.group_id, body.bot_id, body.lead_id, body.result.error_code, body.server_id, body.step_id, body.test, body.vk_user_id].join('');
    this.logger.info(`Строка для хеша: ${values + secret}`);
    return crypto
      .createHash('md5')
      .update(values + secret)
      .digest('hex');
  }

  private async sendRequest(request: { url: string; params: any }): Promise<void> {
    try {
      await this.axios.post(request.url, request.params);
    } catch (exception) {
      this.logger.error('Request failed after max attempts', { exception });
      throw new ServiceUnavailableException('Max attempts reached');
    }
  }
}
