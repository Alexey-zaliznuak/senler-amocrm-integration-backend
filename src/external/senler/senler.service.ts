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

    const { group_id, ...botCallback } = body.botCallback;

    const hash = this.generateHash({ group_id, ...body.botCallback }, body.integrationSecret);

    await this.sendRequest({
      url: this.callbackUrl,
      params: { hash, group_id: body.botCallback.group_id, bot_callback: botCallback },
    });
  }

  private generateHash(body: BotStepWebhookDto['botCallback'], secret: string) {
    const {group_id, ...bodyForHash} = body
    const forHash = `${body.group_id}${JSON.stringify(bodyForHash).replace(/:/g, ": ").replace(/,/g, ", ")}${secret}`;

    this.logger.info(`Тело для хеша:`, bodyForHash);
    this.logger.info(`Строка для хеша: ${forHash}`);

    return crypto
      .createHash('md5')
      .update(forHash)
      .digest('hex');
  }

  private async sendRequest(request: { url: string; params: any }): Promise<void> {
    try {
      await this.axios.postForm(request.url, request.params);
    } catch (exception) {
      this.logger.error('Request failed after max attempts', { exception });
      throw new ServiceUnavailableException('Max attempts reached');
    }
  }
}
