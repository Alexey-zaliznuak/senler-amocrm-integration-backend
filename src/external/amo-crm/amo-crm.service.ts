import { HttpStatus, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { AxiosError } from 'axios';
import { CustomAxiosInstance } from 'src/infrastructure/axios/instance/axios.instance';
import { LOGGER_INJECTABLE_NAME } from 'src/infrastructure/axios/instance/axios.instance.config';
import { AppConfigType } from 'src/infrastructure/config/config.app-config';
import { CONFIG } from 'src/infrastructure/config/config.module';
import { Logger } from 'winston';
import { AXIOS_INJECTABLE_NAME } from './amo-crm.config';
import {
  AcceptUnsortedResponse,
  AddUnsortedResponse,
  AmoCrmError,
  AmoCrmExceptionType,
  AmoCrmOAuthTokenResponse,
  AmoCrmTokens,
  CreateContactResponse,
  editLeadsByIdRequest,
  GetLeadRequest,
  GetLeadResponse,
  GetUnsortedResponse,
  UpdateLeadResponse,
} from './amo-crm.dto';
import { HandleAccessTokenExpiration } from './handlers/expired-token.decorator';
import { RefreshTokensService } from './handlers/handle-tokens-expiration.service';
import { UpdateRateLimitAndThrowIfNeed } from './handlers/rate-limit.decorator';
import { RateLimitsService } from './rate-limit.service';
import { convertExceptionToString } from 'src/utils';

@Injectable()
export class AmoCrmService {
  constructor(
    @Inject(AXIOS_INJECTABLE_NAME) private readonly axios: CustomAxiosInstance,
    @Inject(LOGGER_INJECTABLE_NAME) private readonly logger: Logger,
    @Inject(CONFIG) private readonly config: AppConfigType,
    public readonly refreshTokensService: RefreshTokensService,
    public readonly rateLimitsService: RateLimitsService
  ) {}

  @UpdateRateLimitAndThrowIfNeed()
  async getAccessAndRefreshTokens({
    amoCrmDomainName,
    code,
  }: {
    amoCrmDomainName: string;
    code: string;
  }): Promise<AmoCrmOAuthTokenResponse> {
    const response = await this.axios.post<AmoCrmOAuthTokenResponse>(`https://${amoCrmDomainName}/oauth2/access_token`, {
      client_id: this.config.AMO_CRM_CLIENT_ID,
      client_secret: this.config.AMO_CRM_CLIENT_SECRET,
      grant_type: 'authorization_code',
      code,
      redirect_uri: this.config.AMO_CRM_REDIRECT_URI,
    });

    this.logger.info('Success got amo crm tokens', {
      amoCrmDomainName,
      code,
      data: response.data,
    });

    return response.data;
  }

  @UpdateRateLimitAndThrowIfNeed()
  @HandleAccessTokenExpiration()
  async addContact({
    amoCrmDomainName,
    name,
    first_name,
    last_name,
    tokens,
  }: {
    amoCrmDomainName: string;
    name: string;
    first_name: string;
    last_name: string;
    tokens: AmoCrmTokens;
  }): Promise<CreateContactResponse> {
    try {
      const response = await this.axios.post<CreateContactResponse>(
        `https://${amoCrmDomainName}/api/v4/contacts`,
        {
          name,
          first_name,
          last_name,
        },
        {
          headers: {
            Authorization: `Bearer ${tokens.accessToken}`,
          },
        }
      );

      return response.data;
    } catch (error) {
      this.logger.error('Error adding contact', { error });
      throw new UnauthorizedException('Access tokens истек');
    }
  }

  @UpdateRateLimitAndThrowIfNeed()
  @HandleAccessTokenExpiration()
  async addUnsorted({
    amoCrmDomainName,
    source_name,
    source_uid,
    metadata,
    pipeline_id,
    contactName,
    tokens,
  }: {
    amoCrmDomainName: string;
    source_name: string;
    source_uid: string;
    metadata: object;
    pipeline_id: string;
    contactName: string;
    tokens: AmoCrmTokens;
  }): Promise<AddUnsortedResponse> {
    try {
      const response = await this.axios.post<AddUnsortedResponse>(
        `https://${amoCrmDomainName}/api/v4/leads/unsorted/forms`,
        {
          source_name,
          source_uid,
          metadata,
          pipeline_id,
          _embedded: {
            contacts: [
              {
                name: contactName,
              },
            ],
          },
        },
        {
          headers: {
            Authorization: `Bearer ${tokens.accessToken}`,
          },
        }
      );

      return response.data;
    } catch (error) {
      this.logger.error('Error adding unsorted', { error });
      throw new UnauthorizedException('Failed to add unsorted data');
    }
  }

  @UpdateRateLimitAndThrowIfNeed()
  @HandleAccessTokenExpiration()
  async acceptUnsorted({
    amoCrmDomainName,
    uid,
    user_id,
    status_id,
    tokens,
  }: {
    amoCrmDomainName: string;
    uid: string;
    user_id: string;
    status_id: string;
    tokens: AmoCrmTokens;
  }): Promise<AcceptUnsortedResponse> {
    try {
      const response = await this.axios.post<AcceptUnsortedResponse>(
        `https://${amoCrmDomainName}/api/v4/leads/unsorted/${uid}/accept`,
        {
          user_id,
          status_id,
        },
        {
          headers: {
            Authorization: `Bearer ${tokens.accessToken}`,
          },
        }
      );

      return response.data;
    } catch (error) {
      this.logger.error('Error accepting unsorted', { error });
      throw new UnauthorizedException('Failed to accept unsorted data');
    }
  }

  @UpdateRateLimitAndThrowIfNeed()
  @HandleAccessTokenExpiration()
  async getUnsortedByUID({
    amoCrmDomainName,
    uid,
    tokens,
  }: {
    amoCrmDomainName: string;
    uid: string;
    tokens: AmoCrmTokens;
  }): Promise<GetUnsortedResponse> {
    try {
      const response = await this.axios.get<GetUnsortedResponse>(`https://${amoCrmDomainName}/api/v4/leads/unsorted/${uid}`, {
        headers: {
          Authorization: `Bearer ${tokens.accessToken}`,
        },
      });

      return response.data;
    } catch (error) {
      this.logger.error('Error getting unsorted by UID', { error });
      throw new UnauthorizedException('Failed to get unsorted data');
    }
  }

  @UpdateRateLimitAndThrowIfNeed()
  @HandleAccessTokenExpiration()
  async createLead({
    amoCrmDomainName,
    leads,
    tokens,
  }: {
    amoCrmDomainName: string;
    leads: Array<{
      name: string;
      price?: number;
      status_id?: number;
    }>;
    tokens: AmoCrmTokens;
  }): Promise<GetLeadResponse> {
    const response = await this.axios.post<GetLeadResponse>(`https://${amoCrmDomainName}/api/v4/leads`, leads, {
      headers: {
        Authorization: `Bearer ${tokens.accessToken}`,
      },
    });
    return response.data['_embedded']['leads'][0];
  }

  @UpdateRateLimitAndThrowIfNeed()
  @HandleAccessTokenExpiration()
  async getLeadById(data: GetLeadRequest): Promise<GetLeadResponse> {
    const params = new URLSearchParams();

    params.append('with', 'custom_fields_values');

    const response = await this.axios.get<GetLeadResponse>(
      `https://${data.amoCrmDomainName}/api/v4/leads/${data.leadId}?${params}`,
      {
        headers: {
          Authorization: `Bearer ${data.tokens.accessToken}`,
        },
      }
    );

    if (response.status === HttpStatus.NO_CONTENT) {
      this.logger.error("Lead not found")
      throw new AxiosError('Lead not found', HttpStatus.NO_CONTENT.toString());
    }

    return response.data;
  }

  @UpdateRateLimitAndThrowIfNeed()
  @HandleAccessTokenExpiration()
  async editLeadsById({
    amoCrmDomainName,
    amoCrmLeadId: AmoCRMLeadId,
    price,
    status_id,
    pipeline_id,
    tokens,
    customFieldsValues,
  }: editLeadsByIdRequest): Promise<UpdateLeadResponse> {
    try {
      const response = await this.axios.patch<UpdateLeadResponse>(
        `https://${amoCrmDomainName}/api/v4/leads/${AmoCRMLeadId}`,
        {
          price,
          status_id,
          pipeline_id,
          custom_fields_values: customFieldsValues,
        },
        {
          headers: {
            Authorization: `Bearer ${tokens.accessToken}`,
          },
        }
      );

      return response.data;
    } catch (error) {
      this.logger.error('Error editing lead', { error });

      throw error;
    }
  }

  @UpdateRateLimitAndThrowIfNeed()
  @HandleAccessTokenExpiration()
  async createLeadField({
    amoCrmDomainName,
    fields,
    tokens,
  }: {
    amoCrmDomainName: string;
    fields: Array<{
      type: string;
      name: string;
      is_api_only?: boolean;
    }>;
    tokens: AmoCrmTokens;
  }): Promise<any> {
    try {
      const response = await this.axios.post<any>(`https://${amoCrmDomainName}/api/v4/leads/custom_fields`, fields, {
        headers: {
          Authorization: `Bearer ${tokens.accessToken}`,
        },
      });

      return response.data;
    } catch (error) {
      this.logger.error('Error creating lead field', { error });
      const type = this.getExceptionType(error);
      throw new AmoCrmError(type.type, false, type.humanMessage);
    }
  }

  @UpdateRateLimitAndThrowIfNeed()
  @HandleAccessTokenExpiration()
  async getLeadFields({
    amoCrmDomainName,
    tokens,
  }: {
    amoCrmDomainName: string;
    tokens: AmoCrmTokens;
    page?: number;
    limit?: number;
  }): Promise<any> {
    try {
      const response = await this.axios.get<any>(`https://${amoCrmDomainName}/api/v4/leads/custom_fields`, {
        headers: {
          Authorization: `Bearer ${tokens.accessToken}`,
        },
      });

      return response.data['_embedded']['custom_fields'];
    } catch (error) {
      this.logger.error('Error getting lead field', { error });
      throw error;
    }
  }

  @HandleAccessTokenExpiration()
  async createLeadIfNotExists({
    amoCrmDomainName,
    amoCrmLeadId,
    name,
    tokens,
  }: {
    amoCrmDomainName: string;
    amoCrmLeadId: number;
    name: string;
    tokens: AmoCrmTokens;
  }) {
    try {
      const lead = await this.getLeadById({
        amoCrmDomainName,
        tokens,
        leadId: amoCrmLeadId,
      });

      return lead;
    } catch (error) {
      if (error instanceof AxiosError && (error.response?.status === 404 || error.code === HttpStatus.NO_CONTENT.toString())) {
        const actualLead = await this.createLead({ amoCrmDomainName, leads: [{ name }], tokens });
        this.logger.info('Создан лид, причина: нету лида с таким amoCrmLeadId в самом AMO', {
          labels: { newAmoCrmLead: actualLead.id },
        });
        return actualLead;
      }
      const type = this.getExceptionType(error);
      throw new AmoCrmError(type.type, false, type.humanMessage);
    }
  }

  getExceptionType(exception: AxiosError | AmoCrmError): { type: AmoCrmExceptionType; humanMessage: string } {
    /*
    Return type of amo crm error
    (source)[https://www.amocrm.ru/developers/content/crm_platform/error-codes]
    */
    if (exception instanceof AmoCrmError) {
      return { type: exception.type, humanMessage: exception.message };
    }

    const httpCode = exception.response?.status;
    const error: any = exception.response?.data;
    const message = error?.title;
    const errorCode = error?.status;

    if (message === 'Token has expired') {
      return { type: AmoCrmExceptionType.REFRESH_TOKEN_EXPIRED, humanMessage: 'Непредвиденная ошибка при обновлении токена' };
    }

    if (httpCode === 401 || errorCode === 401) {
      switch (errorCode) {
        case 110:
          return { type: AmoCrmExceptionType.AUTHENTICATION_FAILED, humanMessage: 'Непредвиденная ошибка при авторизации' };
        // case 111:
        // return AmoCrmExceptionType.CAPTCHA_REQUIRED;
        // case 112:
        // return AmoCrmExceptionType.USER_DISABLED;
        case 101:
          return { type: AmoCrmExceptionType.ACCOUNT_NOT_FOUND, humanMessage: 'Аккаунт AmoCrm не найден' };
        default:
          return {
            type: AmoCrmExceptionType.ACCESS_TOKEN_EXPIRED,
            humanMessage: 'Неизвестная ошибка, возможно истек срок токена',
          };
      }
    }

    if (httpCode === 403) {
      switch (errorCode) {
        case 113:
          return {
            type: AmoCrmExceptionType.IP_ACCESS_DENIED,
            humanMessage: 'Запросы были заблокированы для текущего IP системы',
          };
        case 403:
          return { type: AmoCrmExceptionType.ACCOUNT_BLOCKED, humanMessage: 'Аккаунт AmoCrm заблокирован' };
        default:
          return {
            type: AmoCrmExceptionType.INTEGRATION_DEACTIVATED,
            humanMessage: 'Неизвестная ошибка, проверьте наличие доступа интеграции к вашему аккаунту в AmoCrm',
          };
      }
    }

    if (httpCode === 402 || errorCode === 402) {
      return {
        type: AmoCrmExceptionType.PAYMENT_REQUIRED,
        humanMessage:
          'Аккаунт не оплачен или был превышен лимит для текущего тарифа(подробности можно уточнить у техподдержки AmoCrm)',
      };
    }

    if (httpCode === 429) {
      return {
        type: AmoCrmExceptionType.TOO_MANY_REQUESTS,
        humanMessage: 'Превышен лимит запросов в секунду',
      };
    }

    // switch (errorCode) {
    //   case 202:
    //     return AmoCrmExceptionType.CONTACTS_NO_PERMISSION;
    //   case 203:
    //     return AmoCrmExceptionType.CONTACTS_CUSTOM_FIELD_ERROR;
    //   case 205:
    //     return AmoCrmExceptionType.CONTACTS_NOT_CREATED;
    //   case 212:
    //     return AmoCrmExceptionType.CONTACTS_NOT_UPDATED;
    //   case 219:
    //     return AmoCrmExceptionType.CONTACTS_SEARCH_ERROR;
    //   case 330:
    //     return AmoCrmExceptionType.CONTACTS_TOO_MANY_DEALS;
    // }

    // if (errorCode === 330) {
    //   return AmoCrmExceptionType.DEALS_TOO_MANY_CONTACTS;
    // }

    // switch (errorCode) {
    //   case 244:
    //     return AmoCrmExceptionType.EVENTS_NO_PERMISSION;
    //   case 225:
    //     return AmoCrmExceptionType.EVENTS_NOT_FOUND;
    // }

    // switch (errorCode) {
    //   case 231:
    //     return AmoCrmExceptionType.TASKS_NOT_FOUND;
    //   case 233:
    //     return AmoCrmExceptionType.TASKS_CONTACTS_NOT_FOUND;
    //   case 234:
    //     return AmoCrmExceptionType.TASKS_DEALS_NOT_FOUND;
    //   case 235:
    //     return AmoCrmExceptionType.TASKS_TYPE_NOT_SPECIFIED;
    //   case 236:
    //     return AmoCrmExceptionType.TASKS_CONTACTS_NOT_FOUND;
    //   case 237:
    //     return AmoCrmExceptionType.TASKS_DEALS_NOT_FOUND;
    //   case 244:
    //     return AmoCrmExceptionType.DEALS_NO_PERMISSION;
    // }

    // switch (errorCode) {
    //   case 244:
    //     return AmoCrmExceptionType.CATALOGS_NO_PERMISSION;
    //   case 281:
    //     return AmoCrmExceptionType.CATALOGS_NOT_DELETED;
    //   case 282:
    //     return AmoCrmExceptionType.CATALOGS_NOT_FOUND;
    // }

    // switch (errorCode) {
    //   case 203:
    //     return AmoCrmExceptionType.CATALOG_ITEMS_CUSTOM_FIELD_ERROR;
    //   case 204:
    //     return AmoCrmExceptionType.CATALOG_ITEMS_FIELD_NOT_FOUND;
    //   case 244:
    //     return AmoCrmExceptionType.CATALOG_ITEMS_NO_PERMISSION;
    //   case 280:
    //     return AmoCrmExceptionType.CATALOG_ITEMS_CREATED;
    //   case 282:
    //     return AmoCrmExceptionType.CATALOG_ITEMS_NOT_FOUND;
    // }

    // switch (errorCode) {
    //   case 288:
    //     return AmoCrmExceptionType.CUSTOMERS_NO_PERMISSION;
    //   case 402:
    //     return AmoCrmExceptionType.CUSTOMERS_PAYMENT_REQUIRED;
    //   case 425:
    //     return AmoCrmExceptionType.CUSTOMERS_FEATURE_UNAVAILABLE;
    //   case 426:
    //     return AmoCrmExceptionType.CUSTOMERS_FEATURE_DISABLED;
    // }

    switch (errorCode) {
      case 400:
        if (error.detail == 'Payment Required') {
          return {
            type: AmoCrmExceptionType.PAYMENT_REQUIRED,
            humanMessage:
              'Аккаунт не оплачен или был превышен лимит для текущего тарифа(подробности можно уточнить у техподдержки AmoCrm)',
          };
        }
        return {
          type: AmoCrmExceptionType.INVALID_DATA_STRUCTURE,
          humanMessage:
            'Неизвестная ошибка, проверьте корректность переданных данных и оплату аккаунта, также возможно был превышен лимит для текущего тарифа(подробности можно уточнить у техподдержки AmoCrm)',
        };
      case 422:
        return {
          type: AmoCrmExceptionType.DATA_PROCESSING_FAILED,
          humanMessage: 'Неизвестная ошибка 422',
        };
      case 405:
        return {
          type: AmoCrmExceptionType.METHOD_NOT_SUPPORTED,
          humanMessage: 'Неизвестная ошибка 405',
        };
      case 2002:
        return {
          type: AmoCrmExceptionType.NO_CONTENT_FOUND,
          humanMessage: 'Неизвестная ошибка 2002',
        };
    }

    return { type: AmoCrmExceptionType.UNKNOWN_ERROR, humanMessage: 'Неизвестная ошибка, обратитесь в техподдержку AmoCrm' };
  }
}
