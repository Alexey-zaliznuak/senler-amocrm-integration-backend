// import { Inject, Injectable } from '@nestjs/common';
// import { ConfigService } from '@nestjs/config';
// import * as crypto from 'crypto';
// import { LOGGER } from 'src/infrastructure/logging/logging.config';
// import { Logger } from 'winston';
// import { ErrorApiRequestNextStep } from './error-api-request-next-step';
// import { URLHelper } from './helpers/url';

// @Injectable()
export class SenlerService {
//   private readonly maxAttempts = 5;

//   private readonly baseUrl = 'https://senler.ru';
//   private readonly callbackUrl = this.baseUrl + '/api/Integrations/Callback';

//   constructor(
//     @Inject(LOGGER) private readonly logger: Logger,
//     private readonly configService: ConfigService,
//     private readonly urlHelper: URLHelper
//   ) {}

//   private generateHash(params: Record<string, unknown>, secret: string): string {
//     const values = Object.values(params).join('');
//     return crypto
//       .createHash('md5')
//       .update(values + secret)
//       .digest('hex');
//   }

//   async execute(payload: Record<string, any>): Promise<void> {
//     const requiredFields = ['vk_user_id', 'vk_id', 'callback_key', 'bot_callback'];
//     for (const field of requiredFields) {
//       if (!(field in payload)) {
//         this.logger.error(`Missing required field: ${field}`, { payload });
//         throw new Error(`Missing required field: ${field}`);
//       }
//     }

//     const params = {
//       vk_user_id: payload.vk_user_id,
//       vk_group_id: payload.vk_id,
//       bot_callback: JSON.stringify(payload.bot_callback),
//       group_id: payload.group_id,
//     };

//     const hash = this.generateHash(params, payload.callback_key);
//     await this.sendRequest({
//       url: this.callbackUrl,
//       params: { ...params, hash },
//       attempts: 0,
//     });
//   }

//   private async sendRequest(request: { url: string; params: any; attempts: number }): Promise<void> {
//     try {
//       if (request.attempts > 0) {
//         await this.delay(request.attempts);
//       }

//       const response = await this.urlHelper.requestPost(request.url, request.params, 'formData');

//       if (!this.validateResponse(response)) {
//         if (request.attempts < this.maxAttempts) {
//           this.logger.warn('Retrying request...', { attempt: request.attempts + 1 });
//           return this.sendRequest({ ...request, attempts: request.attempts + 1 });
//         }
//         throw new ErrorApiRequestNextStep('Max attempts reached', request, response);
//       }

//       this.logger.info('Request successful', { params: request.params });
//     } catch (error) {
//       if (request.attempts < this.maxAttempts) {
//         return this.sendRequest({ ...request, attempts: request.attempts + 1 });
//       }
//       this.logger.error('Request failed after max attempts', { error });
//       throw new ErrorApiRequestNextStep('Max attempts reached', request, null);
//     }
//   }

//   private validateResponse(response: any): boolean {
//     const statusCode = response?.response?.statusCode;
//     if (!statusCode || statusCode < 200 || statusCode >= 300) {
//       return false;
//     }

//     try {
//       const body = response.body ? JSON.parse(response.body) : null;
//       return body?.success === true;
//     } catch (error) {
//       this.logger.warn('Invalid response body format', { body: response.body });
//       return false;
//     }
//   }

//   private delay(attempt: number): Promise<void> {
//     const delayMs = (Math.pow(2, attempt) + Math.round(Math.random() * 3)) * 1000;
//     this.logger.debug(`Delaying request for ${delayMs}ms`);
//     return new Promise(resolve => setTimeout(resolve, delayMs));
//   }
}
