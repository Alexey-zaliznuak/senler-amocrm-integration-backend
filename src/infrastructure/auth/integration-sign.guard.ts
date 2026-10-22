import { CanActivate, ExecutionContext, Inject, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { createHash, timingSafeEqual } from 'crypto';
import { Logger } from 'winston';
import { AppConfigType } from '../config/config.app-config';
import { CONFIG } from '../config/config.module';
import { PRISMA } from '../database/database.config';
import { PrismaExtendedClientType } from '../database/database.service';
import { LOGGER } from '../logging/logging.config';
import { CustomRequest } from '../requests';
import { INTEGRATION_SIGN_SCOPE, IntegrationSignScope } from './integration-sign-scope.decorator';

type SignCheck = {
  success: boolean;
  variant?: 'standard' | 'legacy_with_channel' | 'legacy_without_context';
  groupId?: number;
  reason?: string;
};

/** Verifies the iframe signature and binds it to the requested Senler group. */
@Injectable()
export class IntegrationSignGuard implements CanActivate {
  constructor(
    @Inject(CONFIG) private readonly config: AppConfigType,
    @Inject(LOGGER) private readonly logger: Logger,
    @Inject(PRISMA) private readonly prisma: PrismaExtendedClientType,
    private readonly reflector: Reflector
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    let result: SignCheck = { success: false, reason: 'verification_error' };
    let request: CustomRequest | undefined;

    try {
      request = context.switchToHttp().getRequest<CustomRequest>();
      result = this.checkSignature(request);
      if (result.success) {
        const scope = this.reflector.getAllAndOverride<IntegrationSignScope>(INTEGRATION_SIGN_SCOPE, [
          context.getHandler(),
          context.getClass(),
        ]);
        if (!(await this.hasResourceAccess(request, result.groupId, scope))) {
          result = { ...result, success: false, reason: 'resource_not_in_group' };
        }
      }
    } catch {
      // Verification/ownership errors must never authorize a request.
      result = { success: false, reason: 'verification_error' };
    }

    try {
      (request?.logger ?? this.logger).info(result.success ? 'SIGN SUCCESS' : 'SIGN UNSUCCESS', {
        context: IntegrationSignGuard.name,
        dryRun: false,
        method: request?.method,
        path: request?.path,
        variant: result.variant,
        reason: result.reason,
      });
    } catch {
      // A logger failure must not change the authorization result.
    }

    return result.success;
  }

  private checkSignature(request: CustomRequest): SignCheck {
    const query = request.query ?? {};
    const body = request.body ?? {};
    const sign = query.sign ?? body.sign ?? body.senlerSign;

    if (sign === undefined || sign === null || sign === '') {
      return { success: false, reason: 'missing_sign' };
    }
    if (typeof sign !== 'string' || !/^[a-f\d]{32}$/i.test(sign)) {
      return { success: false, reason: 'invalid_sign_format' };
    }

    const secret = this.config.SENLER_CLIENT_SECRET;
    if (!secret) {
      return { success: false, reason: 'missing_secret' };
    }

    const params = {
      user_id: query.user_id ?? body.user_id,
      group_id: query.group_id ?? body.group_id ?? body.senlerGroupId,
      context: query.context ?? body.context,
      channel_type_id: query.channel_type_id ?? body.channel_type_id,
    };
    if (
      Object.values(params).some(
        value => value != null && typeof value !== 'string' && !(typeof value === 'number' && Number.isFinite(value))
      )
    ) {
      return { success: false, reason: 'invalid_sign_params' };
    }

    const hasValue = (value: unknown) => value != null && value !== '';
    if (!hasValue(params.user_id) || !hasValue(params.group_id)) {
      return { success: false, reason: 'missing_user_or_group' };
    }

    const prefix = `${params.user_id}${params.group_id}`;
    const candidates: { variant: SignCheck['variant']; value: string }[] = [];

    // SN-5378 / QA-205: MD5 of concatenated values, with no separators or sorting.
    if (hasValue(params.context)) {
      candidates.push({ variant: 'standard', value: `${prefix}${params.context}${secret}` });
      if (hasValue(params.channel_type_id)) {
        candidates.push({
          variant: 'legacy_with_channel',
          value: `${prefix}${params.context}${params.channel_type_id}${secret}`,
        });
      }
    }
    // SN-5197: older backend signatures omit both context and channel_type_id.
    candidates.push({ variant: 'legacy_without_context', value: `${prefix}${secret}` });

    const supplied = Buffer.from(sign, 'hex');
    const match = candidates.find(candidate => timingSafeEqual(createHash('md5').update(candidate.value).digest(), supplied));
    if (!match) return { success: false, reason: 'signature_mismatch' };

    const groupId = this.parseGroupId(params.group_id);
    return groupId === undefined
      ? { success: false, reason: 'invalid_group_id' }
      : { success: true, variant: match.variant, groupId };
  }

  private parseGroupId(value: unknown): number | undefined {
    if (typeof value !== 'number' && (typeof value !== 'string' || !/^\d+$/.test(value))) return undefined;
    const groupId = Number(value);
    return Number.isSafeInteger(groupId) && groupId > 0 ? groupId : undefined;
  }

  private async hasResourceAccess(request: CustomRequest, groupId: number, scope?: IntegrationSignScope): Promise<boolean> {
    switch (scope) {
      case 'group-body':
        return this.parseGroupId(request.body?.senlerGroupId) === groupId;
      case 'group-query':
        return this.parseGroupId(request.query?.senlerGroupId) === groupId;
      case 'group-identifier': {
        if (request.query?.field === 'senlerGroupId') {
          return this.parseGroupId(request.params?.identifier) === groupId;
        }
        if (request.query?.field !== 'id') return false;
        return this.groupBelongsToSignature(request.params?.identifier, groupId);
      }
      case 'template-body':
        return this.groupBelongsToSignature(request.body?.senlerGroupId, groupId);
      case 'template-identifier': {
        const id = request.params?.identifier;
        if (typeof id !== 'string' || !id) return false;
        const template = await this.prisma.integrationStepTemplate.findUnique({
          where: { id },
          select: { senlerGroup: { select: { senlerGroupId: true } } },
        });
        return template?.senlerGroup.senlerGroupId === groupId;
      }
      default:
        return false;
    }
  }

  private async groupBelongsToSignature(id: unknown, groupId: number): Promise<boolean> {
    if (typeof id !== 'string' || !id) return false;
    const group = await this.prisma.senlerGroup.findUnique({ where: { id }, select: { senlerGroupId: true } });
    return group?.senlerGroupId === groupId;
  }
}
