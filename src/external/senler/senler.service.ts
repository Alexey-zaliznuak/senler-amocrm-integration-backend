import { Inject, Injectable, ServiceUnavailableException } from '@nestjs/common';
import * as crypto from 'crypto';
import { BotStepWebhookDto } from 'src/domain/integration/integration.dto';
import { AXIOS, CustomAxiosInstance } from 'src/infrastructure/axios/instance';
import { AppConfigType } from 'src/infrastructure/config/config.app-config';
import { CONFIG } from 'src/infrastructure/config/config.module';
import { LOGGER } from 'src/infrastructure/logging/logging.config';
import { convertExceptionToString, timeToSeconds } from 'src/utils';
import { Logger } from 'winston';

@Injectable()
export class SenlerService {
  private readonly baseUrl = 'https://senler.ru';
  private readonly callbackUrl = this.baseUrl + '/api/Integrations/Callback';
  private readonly getAccessTokenUrl = this.baseUrl + '/ajax/cabinet/OAuth2token';

  constructor(
    @Inject(LOGGER) private readonly logger: Logger,
    @Inject(AXIOS) private readonly axios: CustomAxiosInstance,
    @Inject(CONFIG) private readonly config: AppConfigType
  ) {}

  async getAccessToken(code: string, groupId: number): Promise<string> {
    try {
      const response = await this.axios.get<{ success: boolean; access_token: string }>(this.getAccessTokenUrl, {
        params: {
          client_id: this.config.SENLER_CLIENT_ID,
          client_secret: this.config.SENLER_CLIENT_SECRET,
          redirect_uri: this.config.SENLER_REDIRECT_URI,
          code: code,
          group_id: groupId,
        },
      });

      return response.data.access_token;
    } catch (error) {
      this.logger.error('Request failed after max attempts', { error });
      throw new ServiceUnavailableException('Max attempts reached');
    }
  }

  async sendCallbackOnWebhookRequest(body: BotStepWebhookDto, sendError?: boolean): Promise<void> {
    const { group_id, ...bodyToStringify } = body.botCallback;
    bodyToStringify.result.error_code = sendError ? 1 : 0;

    const stringifiedBody = this.customStringify(bodyToStringify);

    // ! БАГ В СЕНЛЕРЕ ЧТО В СЕКРЕТНОМ КЛЮЧЕ В РЕАЛЬНОСТИ ОТПРАВЛЯЕТСЯ КОЛЛБЕК КЕЙ, ПОЭТОМУ ВОЗМОЖНА ПУТАНИЦА В ИМЕНАХ
    // ! Нужно в вебхуке для integrationCallbackKey выбрать значение - секретный ключ
    const hash = this.generateHash(body.botCallback, body.integrationCallbackKey);

    await this.sendRequest({
      url: this.callbackUrl,
      params: { hash, group_id: body.botCallback.group_id.toString(), bot_callback: stringifiedBody },
    });
  }

  private generateHash(body: BotStepWebhookDto['botCallback'], callbackKey: string) {
    const { group_id, ...bodyForHash } = body;
    const forHash = `${body.group_id}${this.customStringify(bodyForHash)}${callbackKey}`;

    return crypto.createHash('md5').update(forHash).digest('hex');
  }

  private async sendRequest(request: { url: string; params: any }): Promise<void> {
    let attempt = 0;

    while (true) {
      try {
        const response = await this.axios.postForm(request.url, request.params);

        // Проверяем, что сервер вернул именно такую ошибку
        if (
          response.data?.error_code === 0 &&
          response.data?.error_message === 'Internal Error' &&
          response.data?.success === false
        ) {
          attempt++;
          const delay = Math.min(1000 * Math.pow(2, attempt), timeToSeconds({ minutes: 1 })); // экспоненциальный рост до минуты
          this.logger.warn(`Ошибка подтверждения вебхука Сенлер - подсистема недоступна`, {
            nextDelay: delay,
            attempt,
            response: response.data,
          });
          await new Promise(res => setTimeout(res, delay));
          continue;
        }

        return;
      } catch (error) {
        attempt++;
        const delay = Math.min(1000 * Math.pow(2, attempt), timeToSeconds({ minutes: 1 })); // экспоненциальный рост до минуты
        this.logger.warn(`Ошибка подтверждения вебхука Сенлер - возникла непредвиденная ошибка`, {
          nextDelay: delay,
          attempt,
          error: convertExceptionToString(error),
        });
        await new Promise(res => setTimeout(res, delay));
      }
    }
  }

  private customStringify(data: any): string {
    return JSON.stringify(data).replace(/:/g, ': ').replace(/,/g, ', ');
  }
}
