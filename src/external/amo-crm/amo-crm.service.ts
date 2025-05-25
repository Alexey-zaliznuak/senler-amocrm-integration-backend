import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
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

@Injectable()
export class AmoCrmService {
  constructor(
    @Inject(AXIOS_INJECTABLE_NAME) private readonly axios: CustomAxiosInstance,
    @Inject(LOGGER_INJECTABLE_NAME) private readonly logger: Logger,
    @Inject(CONFIG) private readonly config: AppConfigType,
    private readonly refreshTokensService: RefreshTokensService,
    private readonly rateLimitsService: RateLimitsService
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
            Authorization: `Bearer ${tokens.amoCrmAccessToken}`,
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
            Authorization: `Bearer ${tokens.amoCrmAccessToken}`,
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
            Authorization: `Bearer ${tokens.amoCrmAccessToken}`,
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
          Authorization: `Bearer ${tokens.amoCrmAccessToken}`,
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
        Authorization: `Bearer ${tokens.amoCrmAccessToken}`,
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
          Authorization: `Bearer ${data.tokens.amoCrmAccessToken}`,
        },
      }
    );
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
            Authorization: `Bearer ${tokens.amoCrmAccessToken}`,
          },
        }
      );

      return response.data;
    } catch (error) {
      this.logger.error('Error editing lead', { error });

      throw new UnauthorizedException('Error editing lead');
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
          Authorization: `Bearer ${tokens.amoCrmAccessToken}`,
        },
      });

      return response.data;
    } catch (error) {
      this.logger.error('Error creating lead field', { error });
      throw new UnauthorizedException('Failed to create lead field');
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
          Authorization: `Bearer ${tokens.amoCrmAccessToken}`,
        },
      });

      return response.data['_embedded']['custom_fields'];
    } catch (error) {
      this.logger.error('Error creating lead field', { error });
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

      if (lead) return lead;

      const actualLead = await this.createLead({ amoCrmDomainName, leads: [{ name }], tokens });

      return actualLead;
    } catch (error) {
      this.logger.error('Error creating lead if not exists', { error });
      throw new UnauthorizedException('Failed to create lead if not exists');
    }
  }

  getExceptionType(exception: AxiosError | AmoCrmError): AmoCrmExceptionType {
    /*
    Return type of amo crm error
    (source)[https://www.amocrm.ru/developers/content/crm_platform/error-codes]
    */
    if (exception instanceof AmoCrmError) {
      return exception.type;
    }

    const httpCode = exception.response?.status;
    const error: any = exception.response?.data;
    const message = error.title;
    const errorCode = error.status;

    if (message === 'Token has expired') {
      return AmoCrmExceptionType.REFRESH_TOKEN_EXPIRED;
    }

    if (httpCode === 401 || errorCode === 401) {
      switch (errorCode) {
        case 110:
          return AmoCrmExceptionType.AUTHENTICATION_FAILED;
        // case 111:
          // return AmoCrmExceptionType.CAPTCHA_REQUIRED;
        // case 112:
          // return AmoCrmExceptionType.USER_DISABLED;
        case 101:
          return AmoCrmExceptionType.ACCOUNT_NOT_FOUND;
        default:
          return AmoCrmExceptionType.ACCESS_TOKEN_EXPIRED;
      }
    }

    if (httpCode === 403) {
      switch (errorCode) {
        case 113:
          return AmoCrmExceptionType.IP_ACCESS_DENIED;
        case 403:
          return AmoCrmExceptionType.ACCOUNT_BLOCKED;
        default:
          // return AmoCrmExceptionType.FORBIDDEN;
          return AmoCrmExceptionType.INTEGRATION_DEACTIVATED;
      }
    }

    if (httpCode === 402 || errorCode === 402) {
      return AmoCrmExceptionType.PAYMENT_REQUIRED;
    }

    if (httpCode === 429) {
      return AmoCrmExceptionType.TOO_MANY_REQUESTS;
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
        return AmoCrmExceptionType.INVALID_DATA_STRUCTURE;
      case 422:
        return AmoCrmExceptionType.DATA_PROCESSING_FAILED;
      case 405:
        return AmoCrmExceptionType.METHOD_NOT_SUPPORTED;
      case 2002:
        return AmoCrmExceptionType.NO_CONTENT_FOUND;
    }

    // return AmoCrmExceptionType.UNKNOWN_ERROR;
    return AmoCrmExceptionType.INTEGRATION_DEACTIVATED;
  }
}
