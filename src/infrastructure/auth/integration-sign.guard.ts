import { CanActivate, ExecutionContext, Inject, Injectable } from '@nestjs/common';
import { createHash, timingSafeEqual } from 'crypto';
import { Logger } from 'winston';
import { AppConfigType } from '../config/config.app-config';
import { CONFIG } from '../config/config.module';
import { LOGGER } from '../logging/logging.config';
import { CustomRequest } from '../requests';

type SignCheck = {
  success: boolean;
  variant?: 'standard' | 'legacy_with_channel' | 'legacy_without_context';
  reason?: string;
};

/** Observation only: signature failures MUST NOT change the response during rollout. */
@Injectable()
export class IntegrationSignGuard implements CanActivate {
  constructor(
    @Inject(CONFIG) private readonly config: AppConfigType,
    @Inject(LOGGER) private readonly logger: Logger
  ) {}

  canActivate(context: ExecutionContext): boolean {
    let result: SignCheck = { success: false, reason: 'verification_error' };
    let request: CustomRequest | undefined;

    try {
      request = context.switchToHttp().getRequest<CustomRequest>();
      result = this.checkSignature(request);
    } catch {
      // Malformed input or a verification error must not interrupt a production request.
    }

    try {
      (request?.logger ?? this.logger).info(result.success ? 'SIGN SUCCESS' : 'SIGN UNSUCCESS', {
        context: IntegrationSignGuard.name,
        dryRun: true,
        method: request?.method,
        path: request?.path,
        variant: result.variant,
        reason: result.reason,
      });
    } catch {
      // Logging failures must not turn this observation-only guard into an access check.
    }

    return true;
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
    return match ? { success: true, variant: match.variant } : { success: false, reason: 'signature_mismatch' };
  }
}
