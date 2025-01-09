import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { AxiosService } from 'src/infrastructure/axios/instance/axios.instance';
import { AXIOS_INSTANCE } from 'src/infrastructure/axios/instance/axios.instance.config';
import { AppConfigType } from 'src/infrastructure/config/config.app-config';
import { CONFIG } from 'src/infrastructure/config/config.module';
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
import { HandleAccessTokenExpiration } from './handlers/handle-expireds-token.decorator';

export type Token = {
  accessToken: string;
  refreshToken: string;
};

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

  /**
   * Добавление контактов
   *
   * https://www.amocrm.ru/developers/content/crm_platform/contacts-api#contacts-add
   */
  @HandleAccessTokenExpiration()
  async addContact({
    amoCrmDomain,
    name,
    first_name,
    last_name,
    token,
  }: {
    amoCrmDomain: string;
    name: string;
    first_name: string;
    last_name: string;
    token: Token;
  }): Promise<CreateContactResponse> {
    try {
      const response = await this.axios.post<CreateContactResponse>(
        `https://${amoCrmDomain}/api/v4/contacts`,
        {
          name,
          first_name,
          last_name,
        },
        {
          headers: {
            Authorization: `Bearer ${token.accessToken}`,
          },
        },
      );

      return response.data;
    } catch {
      throw new UnauthorizedException('Access token истек');
    }
  }

  /**
   * Добавление неразобранного типа форма
   *
   * https://www.amocrm.ru/developers/content/crm_platform/unsorted-api#unsorted-add-form
   */
  async addUnsorted({
    amoCrmDomain,
    source_name,
    source_uid,
    metadata,
    pipeline_id,
    contactName,
  }: {
    amoCrmDomain: string;
    source_name: string;
    source_uid: string;
    metadata: object;
    pipeline_id: string;
    contactName: string;
  }): Promise<AddUnsortedResponse> {
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
              name: contactName,
            },
          ],
        },
      },
    );

    return response.data;
  }

  /**
   * Принятие неразобранного
   *
   * https://www.amocrm.ru/developers/content/crm_platform/unsorted-api#unsorted-accept
   */
  async acceptUnsorted({
    amoCrmDomain,
    uid,
    user_id,
    status_id,
  }: {
    amoCrmDomain: string;
    uid: string;
    user_id: string;
    status_id: string;
  }): Promise<AcceptUnsortedResponse> {
    const response = await this.axios.post<AcceptUnsortedResponse>(
      `https://${amoCrmDomain}/api/v4/leads/unsorted/${uid}/accept`,
      {
        user_id,
        status_id,
      },
    );

    return response.data;
  }

  /**
   * Получение неразобранного по UID
   *
   * https://www.amocrm.ru/developers/content/crm_platform/unsorted-api#unsorted-detail
   */
  async getUnsortedByUID({
    amoCrmDomain,
    uid,
  }: {
    amoCrmDomain: string;
    uid: string;
  }): Promise<GetUnsortedResponse> {
    const response = await this.axios.get<GetUnsortedResponse>(
      `https://${amoCrmDomain}/api/v4/leads/unsorted/${uid}`,
    );

    return response.data;
  }

  /**
   * Добавление сделок
   *
   * https://www.amocrm.ru/developers/content/crm_platform/leads-api#leads-add
   */
  async addLead({
    amoCrmDomain,
    leads,
  }: {
    amoCrmDomain: string;
    leads: Array<{
      name: string;
      price?: number;
      status_id?: number;
    }>;
  }): Promise<GetLeadResponse> {
    const response = await this.axios.post<GetLeadResponse>(
      `https://${amoCrmDomain}/api/v4/leads`,
      leads,
    );

    return response.data;
  }

  /**
   * Получение сделки по ID
   *
   * https://www.amocrm.ru/developers/content/crm_platform/leads-api#lead-detail
   */
  async getLeadById({
    amoCrmDomain,
    id,
    _with,
  }: {
    amoCrmDomain: string;
    id: number;
    _with?: string;
  }): Promise<GetLeadResponse> {
    const params = new URLSearchParams();
    params.append('with', _with);

    const response = await this.axios.get<GetLeadResponse>(
      `https://${amoCrmDomain}/api/v4/leads/${id}?${params}`,
    );

    return response.data;
  }

  /**
   * Редактирование сделок
   *
   * https://www.amocrm.ru/developers/content/crm_platform/leads-api#leads-edit
   */
  async editLeadsById({
    amoCrmDomain,
    id,
    price,
    status_id,
    pipeline_id,
  }: {
    amoCrmDomain: string;
    id: string;
    price: string;
    status_id: string;
    pipeline_id: string;
  }): Promise<UpdateLeadResponse> {
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

  /**
   * Создание дополнительных полей сущности
   *
   * https://www.amocrm.ru/developers/content/crm_platform/custom-fields#Создание-дополнительных-полей-сущности
   */
  async createLeadField({
    amoCrmDomain,
    fields,
  }: {
    amoCrmDomain: string;
    fields: Array<{
      type: string;
      name: string;
      is_api_only?: boolean;
    }>;
  }): Promise<any> {
    const response = await this.axios.post<any>(
      `https://${amoCrmDomain}/api/v4/leads/custom_fields`,
      fields,
    );

    return response.data;
  }

  /**
   * Создание лида, если его нет
   */
  async createLeadIfNotExists({
    amoCrmDomain,
    amoCrmLeadId,
    name,
  }: {
    amoCrmDomain: string;
    amoCrmLeadId: number;
    name: string;
  }) {
    const lead = await this.getLeadById({ amoCrmDomain, id: amoCrmLeadId });

    if (lead) return lead;

    const actualLead = await this.addLead({ amoCrmDomain, leads: [{ name }] });

    return actualLead;
  }

  // Редактирование дополнительных полей сущности *

  // Список групп полей сущности *

  // Создание групп полей *
}
