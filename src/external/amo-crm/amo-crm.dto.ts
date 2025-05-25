export enum AmoCrmExceptionType {
  INTEGRATION_DEACTIVATED = 'INTEGRATION_DEACTIVATED',
  REFRESH_TOKEN_EXPIRED = 'REFRESH_TOKEN_EXPIRED',
  ACCESS_TOKEN_EXPIRED = 'ACCESS_TOKEN_EXPIRED',
  PAYMENT_REQUIRED = 'PAYMENT_REQUIRED',
  AUTHENTICATION_FAILED = 'AUTHENTICATION_FAILED',
  // CAPTCHA_REQUIRED = 'CAPTCHA_REQUIRED',
  // USER_DISABLED = 'USER_DISABLED',
  ACCOUNT_NOT_FOUND = 'ACCOUNT_NOT_FOUND',
  IP_ACCESS_DENIED = 'IP_ACCESS_DENIED',
  ACCOUNT_BLOCKED = 'ACCOUNT_BLOCKED',
  // FORBIDDEN = 'FORBIDDEN',
  TOO_MANY_REQUESTS = 'TOO_MANY_REQUESTS',
  // CONTACTS_NO_PERMISSION = 'CONTACTS_NO_PERMISSION',
  // CONTACTS_CUSTOM_FIELD_ERROR = 'CONTACTS_CUSTOM_FIELD_ERROR',
  // CONTACTS_NOT_CREATED = 'CONTACTS_NOT_CREATED',
  // CONTACTS_NOT_UPDATED = 'CONTACTS_NOT_UPDATED',
  // CONTACTS_SEARCH_ERROR = 'CONTACTS_SEARCH_ERROR',
  // CONTACTS_TOO_MANY_DEALS = 'CONTACTS_TOO_MANY_DEALS',
  // DEALS_TOO_MANY_CONTACTS = 'DEALS_TOO_MANY_CONTACTS',
  // EVENTS_NO_PERMISSION = 'EVENTS_NO_PERMISSION',
  // EVENTS_NOT_FOUND = 'EVENTS_NOT_FOUND',
  // TASKS_NOT_FOUND = 'TASKS_NOT_FOUND',
  // TASKS_CONTACTS_NOT_FOUND = 'TASKS_CONTACTS_NOT_FOUND',
  // TASKS_DEALS_NOT_FOUND = 'TASKS_DEALS_NOT_FOUND',
  // TASKS_TYPE_NOT_SPECIFIED = 'TASKS_TYPE_NOT_SPECIFIED',
  // DEALS_NO_PERMISSION = 'DEALS_NO_PERMISSION',
  // CATALOGS_NO_PERMISSION = 'CATALOGS_NO_PERMISSION',
  // CATALOGS_NOT_DELETED = 'CATALOGS_NOT_DELETED',
  // CATALOGS_NOT_FOUND = 'CATALOGS_NOT_FOUND',
  // CATALOG_ITEMS_CUSTOM_FIELD_ERROR = 'CATALOG_ITEMS_CUSTOM_FIELD_ERROR',
  // CATALOG_ITEMS_FIELD_NOT_FOUND = 'CATALOG_ITEMS_FIELD_NOT_FOUND',
  // CATALOG_ITEMS_NO_PERMISSION = 'CATALOG_ITEMS_NO_PERMISSION',
  // CATALOG_ITEMS_CREATED = 'CATALOG_ITEMS_CREATED',
  // CATALOG_ITEMS_NOT_FOUND = 'CATALOG_ITEMS_NOT_FOUND',
  // CUSTOMERS_NO_PERMISSION = 'CUSTOMERS_NO_PERMISSION',
  // CUSTOMERS_PAYMENT_REQUIRED = 'CUSTOMERS_PAYMENT_REQUIRED',
  // CUSTOMERS_FEATURE_UNAVAILABLE = 'CUSTOMERS_FEATURE_UNAVAILABLE',
  // CUSTOMERS_FEATURE_DISABLED = 'CUSTOMERS_FEATURE_DISABLED',
  INVALID_DATA_STRUCTURE = 'INVALID_DATA_STRUCTURE',
  DATA_PROCESSING_FAILED = 'DATA_PROCESSING_FAILED',
  METHOD_NOT_SUPPORTED = 'METHOD_NOT_SUPPORTED',
  NO_CONTENT_FOUND = 'NO_CONTENT_FOUND',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

export type AmoCrmTokens = {
  amoCrmAccessToken: string;
  amoCrmRefreshToken: string;
};

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
  leadId: string | number;
  tokens: AmoCrmTokens;
  amoCrmDomainName: string;
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
  price?: string;
  status_id?: string;
  pipeline_id?: string;
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
