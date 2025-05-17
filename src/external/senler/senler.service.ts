import { Inject, Injectable, ServiceUnavailableException } from '@nestjs/common';
import * as crypto from 'crypto';
import { BotStepWebhookDto } from 'src/domain/integration/integration.dto';
import { AXIOS, CustomAxiosInstance } from 'src/infrastructure/axios/instance';
import { LOGGER } from 'src/infrastructure/logging/logging.config';
import { Logger } from 'winston';

@Injectable()
export class SenlerService {
  private readonly baseUrl = 'https://senler.ru';
  private readonly callbackUrl = this.baseUrl + '/api/Integrations/Callback';

  constructor(
    @Inject(LOGGER) private readonly logger: Logger,
    @Inject(AXIOS) private readonly axios: CustomAxiosInstance
  ) {}

  async setCallbackOnWebhookRequest(body: BotStepWebhookDto, sendError?: boolean): Promise<void> {
    const { group_id, ...bodyToStringify } = body.botCallback;
    bodyToStringify.result.error_code = sendError ? 1 : bodyToStringify.result.error_code;

    const stringifiedBody = this.customStringify(bodyToStringify);

    const hash = this.generateHash(body.botCallback, body.integrationSecret);

    await this.sendRequest({
      url: this.callbackUrl,
      params: { hash, group_id: body.botCallback.group_id.toString(), bot_callback: stringifiedBody },
    });
  }

  private generateHash(body: BotStepWebhookDto['botCallback'], secret: string) {
    const { group_id, ...bodyForHash } = body;
    const forHash = `${body.group_id}${this.customStringify(bodyForHash)}${secret}`;

    return crypto.createHash('md5').update(forHash).digest('hex');
  }

  private async sendRequest(request: { url: string; params: any }): Promise<void> {
    try {
      await this.axios.postForm(request.url, request.params);
    } catch (exception) {
      this.logger.error('Request failed after max attempts', { exception });
      throw new ServiceUnavailableException('Max attempts reached');
    }
  }

  private customStringify(data: any): string {
    return JSON.stringify(data).replace(/:/g, ': ').replace(/,/g, ', ');
  }
}
