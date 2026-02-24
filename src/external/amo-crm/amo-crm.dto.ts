export enum AmoCrmExceptionType {
  INTEGRATION_DEACTIVATED = 'INTEGRATION_DEACTIVATED',
  REFRESH_TOKEN_EXPIRED = 'REFRESH_TOKEN_EXPIRED',
  ACCESS_TOKEN_EXPIRED = 'ACCESS_TOKEN_EXPIRED',
  PAYMENT_REQUIRED = 'PAYMENT_REQUIRED',
  AUTHENTICATION_FAILED = 'AUTHENTICATION_FAILED',
  VARIABLE_TYPE_ERROR = 'VARIABLE_TYPE_ERROR',
  ACCOUNT_NOT_FOUND = 'ACCOUNT_NOT_FOUND',
  IP_ACCESS_DENIED = 'IP_ACCESS_DENIED',
  ACCOUNT_BLOCKED = 'ACCOUNT_BLOCKED',
  TOO_MANY_REQUESTS = 'TOO_MANY_REQUESTS',
  INVALID_DATA_STRUCTURE = 'INVALID_DATA_STRUCTURE',
  DATA_PROCESSING_FAILED = 'DATA_PROCESSING_FAILED',
  METHOD_NOT_SUPPORTED = 'METHOD_NOT_SUPPORTED',
  NO_CONTENT_FOUND = 'NO_CONTENT_FOUND',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

export enum AmoCrmFieldErrorCode {
  INVALID_TYPE = 'InvalidType',
}

export type AmoCrmTokens = {
  accessToken: string;
  refreshToken: string;
};

export type AmoCrmOAuthTokenResponse = {
  token_type: string;
  expires_in: number;
  access_token: string;
  refresh_token: string;
};

export type GetOrCreateContactResponse = {
  id: number;
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
  leadId: string | number;
  tokens: AmoCrmTokens;
  amoCrmDomainName: string;
};

export type CreateLeadDto = {
  name?: string;
  price?: number;
  status_id?: number;
  pipeline_id?: number;
  responsible_user_id?: number;
  _embedded?: { contacts: Array<{ id: number }> };
};

export type GetContactRequest = {
  contactId: string | number;
  tokens: AmoCrmTokens;
  amoCrmDomainName: string;
};

export type GetOrCreateContactRequest = {
  contactId?: number;
  tokens: AmoCrmTokens;
  amoCrmDomainName: string;

  name?: string;
  first_name?: string;
  last_name?: string;
};

export type GetContactResponse = {
  id: number;
  name: string;
  first_name: string;
  last_name: string;
  responsible_user_id: number;
  group_id: number;
  created_by: number;
  updated_by: number;
  created_at: number; // Unix timestamp
  updated_at: number; // Unix timestamp
  closest_task_at: number | null;
  is_deleted: boolean;
  is_unsorted: boolean;
  custom_fields_values: Array<AmoCustomField> | null;
  account_id: number;
  _links: {
    self: {
      href: string;
    };
  };
  _embedded: {
    tags: Array<{
      id: number;
      name: string;
      color: string;
    }>;
    companies: Array<{
      id: number;
      name: string;
    }>;
  };
};

export interface AmoCustomField {
  field_id: number;
  field_name: string;
  field_code: string | null;
  field_type: string;
  values: { value: string }[];
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
  custom_fields_values: Array<AmoCustomField> | null;
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

export type editLeadsByIdRequest = {
  amoCrmDomainName: string;
  amoCrmLeadId: number;
  price?: number;
  name?: string;
  statusId?: number;
  pipelineId?: number;
  contactId?: number;
  responsibleUserId?: number;
  tokens: AmoCrmTokens;
  customFieldsValues?: editLeadsByIdCustomFieldsValueRequest[];
};

export type editLeadsByIdCustomFieldsValueRequest = {
  field_id: number;
  values: {
    value: any;
  }[];
};

export type editLeadsByIdVarsValueRequest = {
  vars?: { n: string; v: string }[];
  glob_vars?: { n: string; v: string }[];
};

export class AmoCrmError extends Error {
  type: AmoCrmExceptionType;
  preliminary: boolean; // Если ошибка создана до запроса к амо, например при проверке рейт лимита

  constructor(type: AmoCrmExceptionType, preliminary: boolean = false, message?: string) {
    super(message);
    this.type = type;
    this.preliminary = preliminary;
  }
}

export interface ValidationError {
  errors?: Array<{
    code: string;
    path?: string;
  }>;
}

export interface FieldError {
  code: string;
  path?: string;
}

export interface LeadField {
  id: number;
  name: string;
}
