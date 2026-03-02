import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { AxiosError } from 'axios';
import { CustomAxiosInstance } from 'src/infrastructure/axios/instance/axios.instance';
import { LOGGER_INJECTABLE_NAME } from 'src/infrastructure/axios/instance/axios.instance.config';
import { AppConfigType } from 'src/infrastructure/config/config.app-config';
import { CONFIG } from 'src/infrastructure/config/config.module';
import { convertExceptionToString } from 'src/utils';
import { Logger } from 'winston';
import { AXIOS_INJECTABLE_NAME } from './amo-crm.config';
import {
  AcceptUnsortedResponse,
  AddUnsortedResponse,
  AmoCrmError,
  AmoCrmExceptionType,
  AmoCrmFieldErrorCode,
  AmoCrmOAuthTokenResponse,
  AmoCrmTokens,
  CreateContactResponse,
  CreateLeadDto,
  editLeadsByIdRequest,
  FieldError,
  GetContactRequest,
  GetContactResponse,
  GetLeadRequest,
  GetLeadResponse,
  GetOrCreateContactRequest,
  GetOrCreateContactResponse,
  GetUnsortedResponse,
  UpdateLeadResponse,
  ValidationError,
} from './amo-crm.dto';
import { FieldDto, GetPipelinesResponse, GetUsersResponse, PipelineDto, UserDto } from './get-workspace-info.dto';
import { HandleAccessTokenExpiration } from './handlers/expired-token.decorator';
import { RefreshTokensService } from './handlers/handle-tokens-expiration.service';
import { UpdateRateLimitAndThrowIfNeed } from './handlers/rate-limit.decorator';
import { RateLimitsService } from './rate-limit.service';

export enum AmoCrmApiErrorHumanMessages {
  PAYMENT_OR_LIMIT_UPDATE_REQUIRED = 'Аккаунт не оплачен или был превышен один из его лимитов, обратитесь в техподдержку amoCRM',
  VARIABLE_TYPE_ERROR = 'Переданное значение переменной не соответствует ее типу',
  REFRESH_TOKEN_EXPIRED = 'Ошибка обновления токена интеграции',
  ACCOUNT_NOT_FOUND = 'Не найден указанный аккаунт amoCRM',
  IP_ACCESS_DENIED = 'Интеграция была заблокирована, обратитесь в техподдержку amoCRM',
  ACCOUNT_BLOCKED = 'Аккаунт AmoCrm заблокирован',
  TOO_MANY_REQUESTS = 'Превышен лимит запросов со стороны интеграции',
  UNKNOWN_AUTHORIZATION_ERROR = 'Неизвестная ошибка авторизации',
}

const CUSTOM_FIELDS_PATH_PATTERN = /^custom_fields_values\.(\d+)\./;

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
  async createContact({
    names,
    amoCrmDomainName,
    tokens,
  }: {
    names: { name?: string; first_name?: string; last_name?: string };
    amoCrmDomainName: string;
    tokens: AmoCrmTokens;
  }): Promise<CreateContactResponse> {
    try {
      const response = await this.axios.post<CreateContactResponse>(`https://${amoCrmDomainName}/api/v4/contacts`, names, {
        headers: {
          Authorization: `Bearer ${tokens.accessToken}`,
        },
      });

      return response.data;
    } catch (error) {
      this.logger.error('Error adding contact', { error, names });
      throw error;
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
      throw error;
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
      throw error;
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
      throw error;
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
    leads: Array<CreateLeadDto>;
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
      this.logger.error('Lead not found');
      throw new AxiosError('Lead not found', HttpStatus.NO_CONTENT.toString());
    }

    return response.data;
  }

  @UpdateRateLimitAndThrowIfNeed()
  @HandleAccessTokenExpiration()
  async GetContactById(data: GetContactRequest): Promise<GetContactResponse> {
    const params = new URLSearchParams();

    params.append('with', 'custom_fields_values');

    const response = await this.axios.get<any>(`https://${data.amoCrmDomainName}/api/v4/contacts/${data.contactId}`, {
      headers: {
        Authorization: `Bearer ${data.tokens.accessToken}`,
      },
    });

    if (response.status === HttpStatus.NO_CONTENT) {
      this.logger.error('Contact not found');
      throw new AxiosError('Contact not found', HttpStatus.NO_CONTENT.toString());
    }

    return response.data;
  }

  @UpdateRateLimitAndThrowIfNeed()
  @HandleAccessTokenExpiration()
  async editLeadsById({
    amoCrmDomainName,
    amoCrmLeadId,
    name,
    price,
    statusId,
    pipelineId,
    contactId,
    responsibleUserId,
    tokens,
    customFieldsValues,
    labels,
  }: editLeadsByIdRequest & { labels: { requestId: string } }): Promise<UpdateLeadResponse> {
    try {
      let body = {
        name,
        price,
        status_id: statusId,
        pipeline_id: pipelineId,
        responsible_user_id: responsibleUserId,
        custom_fields_values: customFieldsValues,
      };

      if (contactId !== undefined) {
        body = Object.assign(body, { _embedded: { contacts: [{ id: contactId }] } });
      }

      this.logger.info('Editing lead', { labels });
      const response = await this.axios.patch<UpdateLeadResponse>(
        `https://${amoCrmDomainName}/api/v4/leads/${amoCrmLeadId}`,
        body,
        {
          headers: {
            Authorization: `Bearer ${tokens.accessToken}`,
          },
        }
      );

      this.logger.info('Success editing lead', {
        labels,
        status: response.status,
        statusText: response.statusText,
        data: response.data,
      });

      return response.data;
    } catch (error) {
      this.logger.error('Error editing lead', { error, labels });

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
      const type = await this.getExceptionType(error, amoCrmDomainName, tokens);
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
  }): Promise<FieldDto[]> {
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

  @UpdateRateLimitAndThrowIfNeed()
  @HandleAccessTokenExpiration()
  async getPipelinesWithStatuses({
    amoCrmDomainName,
    tokens,
  }: {
    amoCrmDomainName: string;
    tokens: AmoCrmTokens;
  }): Promise<PipelineDto[]> {
    try {
      const response = await this.axios.get<GetPipelinesResponse>(`https://${amoCrmDomainName}/api/v4/leads/pipelines`, {
        headers: {
          Authorization: `Bearer ${tokens.accessToken}`,
        },
      });

      // Преобразуем ответ в нужный формат
      const pipelines = response.data._embedded.pipelines.map(pipeline => ({
        id: pipeline.id,
        name: pipeline.name,
        statuses: pipeline._embedded.statuses.map(status => ({
          id: status.id,
          name: status.name,
        })),
      }));

      this.logger.info('Successfully fetched pipelines with statuses', {
        amoCrmDomainName,
        pipelinesCount: pipelines.length,
      });

      return pipelines;
    } catch (error) {
      this.logger.error('Error getting pipelines with statuses', { error });
      throw error;
    }
  }

  @UpdateRateLimitAndThrowIfNeed()
  @HandleAccessTokenExpiration()
  async getUsers({ amoCrmDomainName, tokens }: { amoCrmDomainName: string; tokens: AmoCrmTokens }): Promise<UserDto[]> {
    try {
      const response = await this.axios.get<GetUsersResponse>(`https://${amoCrmDomainName}/api/v4/users`, {
        headers: {
          Authorization: `Bearer ${tokens.accessToken}`,
        },
      });

      // Преобразуем ответ в упрощенный формат
      const users = response.data._embedded.users.map(user => ({
        id: user.id,
        name: user.name,
      }));

      this.logger.info('Successfully fetched users', {
        amoCrmDomainName,
        usersCount: users.length,
      });

      return users;
    } catch (error) {
      this.logger.error('Error getting users', { error });
      throw error;
    }
  }

  @HandleAccessTokenExpiration()
  async createLeadIfNotExists({
    amoCrmDomainName,
    amoCrmLeadId,
    name,
    price,
    statusId,
    contactId,
    pipelineId,
    responsibleUserId,
    tokens,
  }: {
    amoCrmDomainName: string;
    amoCrmLeadId: number;
    name: string;
    price?: number;
    statusId?: number;
    pipelineId?: number;
    contactId?: number;
    responsibleUserId?: number;
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
        const leadPayload: CreateLeadDto = {
          name,
          price,
          status_id: statusId,
          pipeline_id: pipelineId,
          responsible_user_id: responsibleUserId,
        };
        if (contactId != null) {
          leadPayload._embedded = { contacts: [{ id: contactId }] };
        }
        const actualLead = await this.createLead({
          amoCrmDomainName,
          leads: [leadPayload],
          tokens,
        });
        this.logger.info('Создан лид, причина: нету лида с таким amoCrmLeadId в самом AMO', {
          labels: { newAmoCrmLead: actualLead.id },
        });
        return actualLead;
      }
      const type = await this.getExceptionType(error, amoCrmDomainName, tokens);
      throw new AmoCrmError(type.type, false, type.humanMessage);
    }
  }

  @HandleAccessTokenExpiration()
  async CreateContactIfNotExists(data: GetOrCreateContactRequest): Promise<GetOrCreateContactResponse> {
    if (!data.contactId) {
      const contact = await this.createContact({
        names: {
          name: data.name,
          first_name: data.first_name,
          last_name: data.last_name,
        },
        amoCrmDomainName: data.amoCrmDomainName,
        tokens: data.tokens,
      });
      this.logger.info('Создан контакт, причина: не указан contactId', {
        labels: { newAmoCrmContact: { id: contact.id } },
      });
      return contact;
    }

    try {
      const contact = await this.GetContactById({
        contactId: data.contactId,
        tokens: data.tokens,
        amoCrmDomainName: data.amoCrmDomainName,
      });
      return { id: contact.id };
    } catch (error) {
      if (error instanceof AxiosError && (error.response?.status === 404 || error.code === HttpStatus.NO_CONTENT.toString())) {
        const contact = await this.createContact({
          names: {
            name: data.name,
            first_name: data.first_name,
            last_name: data.last_name,
          },
          amoCrmDomainName: data.amoCrmDomainName,
          tokens: data.tokens,
        });
        this.logger.info('Создан контакт, причина: нету контакта с таким amoCrmContactId в самом AMO', {
          labels: { newAmoCrmContact: { id: contact.id } },
        });
        return contact;
      }
      const type = await this.getExceptionType(error, data.amoCrmDomainName, data.tokens);
      throw new AmoCrmError(type.type, false, type.humanMessage);
    }
  }

  async getExceptionType(
    exception: AxiosError | AmoCrmError,
    amoCrmDomainName: string,
    tokens: AmoCrmTokens
  ): Promise<{ type: AmoCrmExceptionType; humanMessage: string }> {
    /*
    Return type of amo crm error
    (source)[https://www.amocrm.ru/developers/content/crm_platform/error-codes]
    TODO: сделать конкретные классы ошибок, разделить их на retryable и нет, возврат сразу списка ошибок
    */
    if (exception instanceof AmoCrmError) {
      return { type: exception.type, humanMessage: exception.message };
    }

    const httpCode = exception.response?.status;
    const error: any = exception.response?.data;
    const message = error?.title;
    const errorCode = error?.status;

    if (httpCode === 400 && error?.['validation-errors']?.length > 0) {
      const validationErrors = error['validation-errors'] as ValidationError[];

      // Находим первую ошибку InvalidType один раз
      const firstInvalidTypeError = validationErrors
        .flatMap(ve => ve.errors || [])
        .find((err: FieldError) => err.code === AmoCrmFieldErrorCode.INVALID_TYPE);

      if (firstInvalidTypeError) {
        const leadFields = await this.getLeadFields({ amoCrmDomainName, tokens });

        let variableName = 'переменной';

        if (firstInvalidTypeError.path) {
          const path = firstInvalidTypeError.path;
          const customFieldMatch = path.match(CUSTOM_FIELDS_PATH_PATTERN);

          if (customFieldMatch && exception?.config) {
            try {
              const requestConfig = exception.config;
              const requestData = typeof requestConfig?.data === 'string' ? JSON.parse(requestConfig.data) : requestConfig?.data;

              const fieldIndex = parseInt(customFieldMatch[1], 10);
              const failedField = requestData?.custom_fields_values?.[fieldIndex];

              if (failedField?.field_id && leadFields?.length > 0) {
                const field = leadFields.find((f: { id: any }) => f.id === failedField.field_id);
                if (field) {
                  variableName = field.name ? `поле: «${field.name}»` : `переменной с ID ${failedField.field_id}`;
                }
              }
            } catch (e) {
              this.logger.error('Ошибка получения имени переменной с неправильным типом данных из запроса к amoCRM', {
                message: convertExceptionToString(e),
              });
            }
          }
        }

        return {
          type: AmoCrmExceptionType.VARIABLE_TYPE_ERROR,
          humanMessage: `${AmoCrmApiErrorHumanMessages.VARIABLE_TYPE_ERROR} (${variableName})`,
        };
      }
    }

    if (message === 'Token has expired') {
      return { type: AmoCrmExceptionType.REFRESH_TOKEN_EXPIRED, humanMessage: AmoCrmApiErrorHumanMessages.REFRESH_TOKEN_EXPIRED };
    }

    if (httpCode === 401 || errorCode === 401) {
      switch (errorCode) {
        case 110:
          return {
            type: AmoCrmExceptionType.AUTHENTICATION_FAILED,
            humanMessage: AmoCrmApiErrorHumanMessages.UNKNOWN_AUTHORIZATION_ERROR,
          };
        case 101:
          return { type: AmoCrmExceptionType.ACCOUNT_NOT_FOUND, humanMessage: AmoCrmApiErrorHumanMessages.ACCOUNT_NOT_FOUND };
        default:
          return {
            type: AmoCrmExceptionType.PAYMENT_REQUIRED,
            humanMessage: AmoCrmApiErrorHumanMessages.PAYMENT_OR_LIMIT_UPDATE_REQUIRED,
          };
      }
    }

    if (httpCode === 403) {
      switch (errorCode) {
        case 113:
          return {
            type: AmoCrmExceptionType.IP_ACCESS_DENIED,
            humanMessage: AmoCrmApiErrorHumanMessages.IP_ACCESS_DENIED,
          };
        case 403:
          return { type: AmoCrmExceptionType.ACCOUNT_BLOCKED, humanMessage: AmoCrmApiErrorHumanMessages.ACCOUNT_BLOCKED };
        default:
          return {
            type: AmoCrmExceptionType.PAYMENT_REQUIRED,
            humanMessage: AmoCrmApiErrorHumanMessages.PAYMENT_OR_LIMIT_UPDATE_REQUIRED,
          };
      }
    }

    if (httpCode === 402 || errorCode === 402) {
      return {
        type: AmoCrmExceptionType.PAYMENT_REQUIRED,
        humanMessage: AmoCrmApiErrorHumanMessages.PAYMENT_OR_LIMIT_UPDATE_REQUIRED,
      };
    }

    if (httpCode === 429) {
      return {
        type: AmoCrmExceptionType.TOO_MANY_REQUESTS,
        humanMessage: AmoCrmApiErrorHumanMessages.TOO_MANY_REQUESTS,
      };
    }

    switch (errorCode) {
      case 400:
        if (error.detail == 'Payment Required') {
          return {
            type: AmoCrmExceptionType.PAYMENT_REQUIRED,
            humanMessage: AmoCrmApiErrorHumanMessages.PAYMENT_OR_LIMIT_UPDATE_REQUIRED,
          };
        }
        return {
          type: AmoCrmExceptionType.PAYMENT_REQUIRED,
          humanMessage: AmoCrmApiErrorHumanMessages.PAYMENT_OR_LIMIT_UPDATE_REQUIRED,
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

    return {
      type: AmoCrmExceptionType.PAYMENT_REQUIRED,
      humanMessage: AmoCrmApiErrorHumanMessages.PAYMENT_OR_LIMIT_UPDATE_REQUIRED,
    };
  }
}
