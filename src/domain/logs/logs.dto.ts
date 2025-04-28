interface TransformedLog {
  profile: {
    body: Record<string, any>;
    leadId: string;
    groupId: string;
    status: string;
    requestTitle: string;
  };
  data: Array<{
    timestamp: string;
    message: string;
    level: string;
    context: string;
    [key: string]: any;
  }>;
}

interface TransformedLogWithSortKey extends TransformedLog {
  _sortKey: string;
}

interface TransformedResponse {
  count: number;
  logs: TransformedLog[];
}