import { SetMetadata } from '@nestjs/common';

export type IntegrationSignScope = 'group-body' | 'group-query' | 'group-identifier' | 'template-body' | 'template-identifier';

export const INTEGRATION_SIGN_SCOPE = 'integration-sign-scope';
export const SignScope = (scope: IntegrationSignScope) => SetMetadata(INTEGRATION_SIGN_SCOPE, scope);
