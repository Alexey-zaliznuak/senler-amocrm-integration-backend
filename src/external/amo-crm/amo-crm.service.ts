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
import { HandleAccessTokenExpiration } from './handlers/expired-token.decorator';

export type AmoCrmToken = {
  amoCrmAccessToken: string;
  amoCrmRefreshToken: string;
};

@Injectable()
export class AmoCrmService {
  constructor(
    @Inject(AXIOS_INSTANCE) private readonly axios: AxiosService,
    @Inject(AMO_CRM_LOGGER) private readonly logger: Logger,
    @Inject(CONFIG) private readonly config: AppConfigType
  ) {}

  async getAccessAndRefreshTokens(amoCrmDomain: string, code: string): Promise<AmoCrmOAuthTokenResponse> {
    const response = await this.axios.post<AmoCrmOAuthTokenResponse>(`https://${amoCrmDomain}/oauth2/access_token`, {
      client_id: this.config.AMO_CRM_CLIENT_ID,
      client_secret: this.config.AMO_CRM_CLIENT_SECRET,
      grant_type: 'authorization_code',
      code,
      redirect_uri: this.config.AMO_CRM_REDIRECT_URI,
    });

    this.logger.info('Success got amo crm tokens', {
      amoCrmDomain,
      code,
      data: response.data,
    });

    return response.data;
  }

  // @HandleAccessTokenExpiration()
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
    token: AmoCrmToken;
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
            Authorization: `Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsImp0aSI6IjFmYzZhYzU5OWU1ZjIxNjNmYzY1NDBlZTMyOWI3NDRiNzM4Y2NjOWRlMjNhOWI0NzhhNWY4MGNkYTAwNzcxNGM3ZTBiY2JhZDA1MGZkMzcyIn0.eyJhdWQiOiIwMTk1N2NlYy0zZDFjLTRjZjItYTBjZC0yNDk1ODQxODUyMGUiLCJqdGkiOiIxZmM2YWM1OTllNWYyMTYzZmM2NTQwZWUzMjliNzQ0YjczOGNjYzlkZTIzYTliNDc4YTVmODBjZGEwMDc3MTRjN2UwYmNiYWQwNTBmZDM3MiIsImlhdCI6MTczNzIxMjEwMCwibmJmIjoxNzM3MjEyMTAwLCJleHAiOjE3MzcyOTgyNjgsInN1YiI6IjExODMyODkwIiwiZ3JhbnRfdHlwZSI6IiIsImFjY291bnRfaWQiOjMyMDkzMTMwLCJiYXNlX2RvbWFpbiI6ImFtb2NybS5ydSIsInZlcnNpb24iOjIsInNjb3BlcyI6WyJwdXNoX25vdGlmaWNhdGlvbnMiLCJmaWxlcyIsImNybSIsImZpbGVzX2RlbGV0ZSIsIm5vdGlmaWNhdGlvbnMiXSwiaGFzaF91dWlkIjpudWxsLCJhcGlfZG9tYWluIjoiYXBpLWIuYW1vY3JtLnJ1In0.HDJ0lU9waDTJsofwJQ_YlkI7mee1HnrUPSz8aDZT4bQbv5_vfNj2UP7cc___1RbqpqssCOA0nnVX52ArtPpB41_TnRzT6jT2XTA4IN_LqCrDSaFB0roSNbRjwg2WEly9FrYnRYZMvlsQWx9pSHab0gPRCSU_leI8sN6acidtq5qcvM16xxfj5kb5ApwayG2h-csTlOLt9wRH7DpckIbCrPDBsWQnsG9FjYWxh61HIUS4EaVZokChgi-jgWLSOFkSgSGT00zdmK1gfDvedpRA6XVIuCFrkSI6xi4QDfWvUgnRTBuL1xpHjus8w3o79sNGbmJPy6km5YqJ_h1cLE9C2w`,
          },
        }
      );
      return response.data;
    } catch (error) {
      this.logger.error('Error adding contact', { error });
      throw new UnauthorizedException('Access token истек');
    }
  }

  @HandleAccessTokenExpiration()
  async addUnsorted({
    amoCrmDomain,
    source_name,
    source_uid,
    metadata,
    pipeline_id,
    contactName,
    token,
  }: {
    amoCrmDomain: string;
    source_name: string;
    source_uid: string;
    metadata: object;
    pipeline_id: string;
    contactName: string;
    token: AmoCrmToken;
  }): Promise<AddUnsortedResponse> {
    try {
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
        {
          headers: {
            Authorization: `Bearer ${token.amoCrmAccessToken}`,
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
    amoCrmDomain,
    uid,
    user_id,
    status_id,
    token,
  }: {
    amoCrmDomain: string;
    uid: string;
    user_id: string;
    status_id: string;
    token: AmoCrmToken;
  }): Promise<AcceptUnsortedResponse> {
    try {
      const response = await this.axios.post<AcceptUnsortedResponse>(
        `https://${amoCrmDomain}/api/v4/leads/unsorted/${uid}/accept`,
        {
          user_id,
          status_id,
        },
        {
          headers: {
            Authorization: `Bearer ${token.amoCrmAccessToken}`,
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
  async getUnsortedByUID({ amoCrmDomain, uid, token }: { amoCrmDomain: string; uid: string; token: AmoCrmToken }): Promise<GetUnsortedResponse> {
    try {
      const response = await this.axios.get<GetUnsortedResponse>(`https://${amoCrmDomain}/api/v4/leads/unsorted/${uid}`, {
        headers: {
          Authorization: `Bearer ${token.amoCrmAccessToken}`,
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
    amoCrmDomain,
    leads,
    token,
  }: {
    amoCrmDomain: string;
    leads: Array<{
      name: string;
      price?: number;
      status_id?: number;
    }>;
    token: AmoCrmToken;
  }): Promise<GetLeadResponse> {
    try {
      const response = await this.axios.post<GetLeadResponse>(`https://${amoCrmDomain}/api/v4/leads`, leads, {
        headers: {
          Authorization: `Bearer ${token.amoCrmAccessToken}`,
        },
      });
      return response.data;
    } catch (error) {
      this.logger.error('Error adding lead', { error });
      throw new UnauthorizedException('Failed to add lead');
    }
  }

  @HandleAccessTokenExpiration()
  async getLeadById({ amoCrmDomain, id, _with, token }: { amoCrmDomain: string; id: number; _with?: string; token: AmoCrmToken }): Promise<GetLeadResponse> {
    try {
      const params = new URLSearchParams();
      params.append('with', _with);

      const response = await this.axios.get<GetLeadResponse>(`https://${amoCrmDomain}/api/v4/leads/${id}?${params}`, {
        headers: {
          Authorization: `Bearer ${token.amoCrmAccessToken}`,
        },
      });

      return response.data;
    } catch (error) {
      this.logger.error('Error getting lead by ID', { error });
      throw new UnauthorizedException('Failed to get lead data');
    }
  }

  @HandleAccessTokenExpiration()
  async editLeadsById({
    amoCrmDomain,
    id,
    price,
    status_id,
    pipeline_id,
    token,
  }: {
    amoCrmDomain: string;
    id: string;
    price: string;
    status_id: string;
    pipeline_id: string;
    token: AmoCrmToken;
  }): Promise<UpdateLeadResponse> {
    try {
      const response = await this.axios.patch<UpdateLeadResponse>(
        `https://${amoCrmDomain}/api/v4/leads/${id}`,
        {
          price,
          status_id,
          pipeline_id,
        },
        {
          headers: {
            Authorization: `Bearer ${token.amoCrmAccessToken}`,
          },
        }
      );

      return response.data;
    } catch (error) {
      this.logger.error('Error editing lead', { error });
      throw new UnauthorizedException('Failed to edit lead data');
    }
  }

  @HandleAccessTokenExpiration()
  async createLeadField({
    amoCrmDomain,
    fields,
    token,
  }: {
    amoCrmDomain: string;
    fields: Array<{
      type: string;
      name: string;
      is_api_only?: boolean;
    }>;
    token: AmoCrmToken;
  }): Promise<any> {
    try {
      const response = await this.axios.post<any>(`https://${amoCrmDomain}/api/v4/leads/custom_fields`, fields, {
        headers: {
          Authorization: `Bearer ${token.amoCrmAccessToken}`,
        },
      });

      return response.data;
    } catch (error) {
      this.logger.error('Error creating lead field', { error });
      throw new UnauthorizedException('Failed to create lead field');
    }
  }

  @HandleAccessTokenExpiration()
  async createLeadIfNotExists({ amoCrmDomain, amoCrmLeadId, name, token }: { amoCrmDomain: string; amoCrmLeadId: number; name: string; token: AmoCrmToken }) {
    try {
      const lead = await this.getLeadById({ amoCrmDomain, id: amoCrmLeadId, token });

      if (lead) return lead;

      const actualLead = await this.addLead({ amoCrmDomain, leads: [{ name }], token });

      return actualLead;
    } catch (error) {
      this.logger.error('Error creating lead if not exists', { error });
      throw new UnauthorizedException('Failed to create lead if not exists');
    }
  }
}
