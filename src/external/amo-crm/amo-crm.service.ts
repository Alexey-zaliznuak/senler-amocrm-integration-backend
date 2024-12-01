import { Inject, Injectable } from '@nestjs/common';
import { AxiosService } from 'src/infrastructure/axios/instance/axios.instance';
import { AXIOS_INSTANCE } from 'src/infrastructure/axios/instance/axios.instance.config';
import { Logger } from 'winston';
import { AMO_CRM_LOGGER } from './amo-crm.config';
import {
  AcceptUnsortedResponse,
  AddUnsortedResponse,
  AmoCrmOAuthTokenResponse,
  CreateContactResponse,
  GetLeadResponse,
  GetUnsortedResponse,
  UpdateLeadResponse,
} from './amo-crm.dto';
import { CONFIG } from 'src/infrastructure/config/config.module';
import { AppConfigType } from 'src/infrastructure/config/config.app-config';

@Injectable()
export class AmoCrmService {
  constructor(
    @Inject(AXIOS_INSTANCE) private readonly axios: AxiosService,
    @Inject(AMO_CRM_LOGGER) private readonly logger: Logger,
    @Inject(CONFIG) private readonly config: AppConfigType,
  ) {}

  async getAccessAndRefreshTokens(
    amoCrmDomain: string,
    code: string,
  ): Promise<AmoCrmOAuthTokenResponse> {
    const response = await this.axios.post<AmoCrmOAuthTokenResponse>(
      `https://${amoCrmDomain}/oauth2/access_token`,
      {
        client_id: this.config.AMO_CRM_CLIENT_ID,
        client_secret: this.config.AMO_CRM_CLIENT_SECRET,
        grant_type: 'authorization_code',
        code,
        redirect_uri: this.config.AMO_CRM_REDIRECT_URI,
      },
    );

    this.logger.info('Success got amo crm tokens', {
      amoCrmDomain,
      code,
      data: response.data,
    });

    return response.data;
  }

  // Добавление контактов
  async addContact(
    amoCrmDomain: string,
    name: string,
    first_name: string,
    last_name: string,
  ): Promise<CreateContactResponse> {
    const response = await this.axios.post<CreateContactResponse>(
      `https://${amoCrmDomain}/api/v4/contacts`,
      {
        name,
        first_name,
        last_name,
      },
    );

    return response.data;
  }

  // Добавление неразобранного типа форма
  async addUnsorted(
    amoCrmDomain: string,
    source_name: string,
    source_uid: string,
    metadata: string,
    pipeline_id: string,
    contactId: string,
  ): Promise<AddUnsortedResponse> {
    const response = await this.axios.post<AddUnsortedResponse>(
      `https://${amoCrmDomain}/api/v4/leads/unsorted/forms`,
      {
        source_name,
        source_uid,
        metadata,
        pipeline_id,
        _embedded: {
          contacts: [
            {
              id: contactId,
            },
          ],
        },
      },
    );

    return response.data;
  }

  // Принятие неразобранного
  async acceptUnsorted(
    amoCrmDomain: string,
    uid: string,
    user_id: string,
    status_id: string,
  ): Promise<AcceptUnsortedResponse> {
    const response = await this.axios.post<AcceptUnsortedResponse>(
      `https://${amoCrmDomain}/api/v4/leads/unsorted/${uid}/accept`,
      {
        user_id,
        status_id,
      },
    );

    return response.data;
  }

  // Получение неразобранного по UID
  async getUnsorted(
    amoCrmDomain: string,
    uid: string,
  ): Promise<GetUnsortedResponse> {
    const response = await this.axios.get<GetUnsortedResponse>(
      `https://${amoCrmDomain}/api/v4/leads/unsorted/${uid}`,
    );

    return response.data;
  }

  // Получение сделки по ID
  async getLead(
    amoCrmDomain: string,
    id: string,
    _with: string,
  ): Promise<GetLeadResponse> {
    const params = new URLSearchParams();
    params.append('with', _with);

    const response = await this.axios.get<GetLeadResponse>(
      `https://${amoCrmDomain}/api/v4/leads/${id}?${params}`,
    );

    return response.data;
  }

  // Редактирование сделок
  async editLeads(
    amoCrmDomain: string,
    id: string,
    price: string,
    status_id: string,
    pipeline_id: string,
  ): Promise<UpdateLeadResponse> {
    const response = await this.axios.patch<UpdateLeadResponse>(
      `https://${amoCrmDomain}/api/v4/leads/${id}`,
      {
        price,
        status_id,
        pipeline_id,
      },
    );

    return response.data;
  }

  // Добавление сделок ?

  // Создание дополнительных полей сущности
  async createLeadField(
    amoCrmDomain: string,
    type: string,
    name: string,
    is_api_only: string,
  ): Promise<any> {
    const response = await this.axios.post<any>(
      `https://${amoCrmDomain}/api/v4/leads/custom_fields`,
      {
        type,
        name,
        is_api_only,
      },
    );

    return response.data;
  }

  // Редактирование дополнительных полей сущности *

  // Список групп полей сущности *

  // Создание групп полей *
}
