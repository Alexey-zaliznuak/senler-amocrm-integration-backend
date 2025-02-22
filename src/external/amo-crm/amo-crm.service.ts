import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { AxiosService } from 'src/infrastructure/axios/instance/axios.instance';
import { LOGGER_INJECTABLE_NAME } from 'src/infrastructure/axios/instance/axios.instance.config';
import { AppConfigType } from 'src/infrastructure/config/config.app-config';
import { CONFIG } from 'src/infrastructure/config/config.module';
import { Logger } from 'winston';
import {
  AcceptUnsortedResponse,
  AddUnsortedResponse,
  AmoCrmOAuthTokenResponse,
  CreateContactResponse,
  editLeadsByIdRequest,
  GetLeadRequest,
  GetLeadResponse,
  GetUnsortedResponse,
  UpdateLeadResponse,
} from './amo-crm.dto';
import { HandleAccessTokenExpiration } from './handlers/expired-token.decorator';
import { AXIOS_INJECTABLE_NAME } from './amo-crm.config';
import { RefreshTokensService } from './handlers/handle-tokens-expiration.service';

export type AmoCrmTokens = {
  amoCrmAccessToken: string;
  amoCrmRefreshToken: string;
};

@Injectable()
export class AmoCrmService {
  constructor(
    @Inject(AXIOS_INJECTABLE_NAME) private readonly axios: AxiosService,
    @Inject(LOGGER_INJECTABLE_NAME) private readonly logger: Logger,
    @Inject(CONFIG) private readonly config: AppConfigType,
    private readonly refreshTokensService: RefreshTokensService
  ) {}

  async getAccessAndRefreshTokens(amoCrmDomainName: string, code: string): Promise<AmoCrmOAuthTokenResponse> {
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

  @HandleAccessTokenExpiration()
  async addLead({
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
    this.logger.debug('Get lead by id response data:', response.data);
    return response.data;
  }

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

      const actualLead = await this.addLead({ amoCrmDomainName, leads: [{ name }], tokens });

      return actualLead;
    } catch (error) {
      this.logger.error('Error creating lead if not exists', { error });
      throw new UnauthorizedException('Failed to create lead if not exists');
    }
  }
}
