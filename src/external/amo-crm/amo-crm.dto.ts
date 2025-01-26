export type AmoCrmOAuthTokenResponse = {
  token_type: string;
  expires_in: number;
  access_token: string;
  refresh_token: string;
};

export type CreateContactResponse = {
  id: number;
  request_id: string;
};

export type AddUnsortedResponse = {
  uid: string;
  account_id: number;
  _embedded: {
    contacts: Array<{
      id: number;
    }>;
    companies: Array<{
      id: number;
    }>;
    leads: Array<{
      id: number;
    }>;
  };
  request_id: string;
};

export type AcceptUnsortedResponse = {
  uid: string;
  category: string;
  pipeline_id: number;
  created_at: number;
  _embedded: {
    contacts: Array<{
      id: number;
    }>;
    companies: Array<{
      id: number;
    }>;
    leads: Array<{
      id: number;
    }>;
  };
};

export type GetUnsortedResponse = {
  uid: string;
  source_uid: string;
  source_name: string;
  category: string;
  pipeline_id: number;
  created_at: number;
  metadata: object;
  account_id: number;
  _embedded: {
    contacts: Array<{
      id: number;
    }>;
    companies: Array<{
      id: number;
    }>;
    leads: Array<{
      id: number;
    }>;
  };
};

export type GetLeadRequest = {
  leadId: string | number,
  amoCrmAccessToken: string,
  amoCrmDomainName: string,
}

export type GetLeadResponse = {
  id: number;
  name: string;
  price: number;
  responsible_user_id: number;
  group_id: number;
  status_id: number;
  pipeline_id: number;
  loss_reason_id: number;
  source_id: number;
  created_by: number;
  updated_by: number;
  closed_at: number;
  created_at: number;
  updated_at: number;
  closest_task_at: number;
  is_deleted: boolean;
  custom_fields_values: Array<any> | null;
  score: number | null;
  account_id: number;
  labor_cost: number;
  is_price_modified_by_robot: boolean;
  _embedded: {
    loss_reason: {
      id: number;
      name: string;
    };
    tags: Array<{
      id: number;
      name: string;
      color: string | null;
    }>;
    contacts: Array<{
      id: number;
      is_main: boolean;
    }>;
    companies: Array<{
      id: number;
    }>;
    catalog_elements: Array<{
      id: number;
      metadata: object;
      quantity: number;
      catalog_id: number;
      price_id: number;
    }>;
  };
};

export type UpdateLeadResponse = {
  id: number;
  updated_at: number;
};
