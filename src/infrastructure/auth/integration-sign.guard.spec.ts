import { ExecutionContext } from '@nestjs/common';
import { createHash } from 'crypto';
import { Logger } from 'winston';
import { AppConfigType } from '../config/config.app-config';
import { IntegrationSignGuard } from './integration-sign.guard';

describe('IntegrationSignGuard (observation only)', () => {
  const secret = 'test-integration-secret';
  const params = { user_id: '0012', group_id: '345', context: 'Bot_step', channel_type_id: '0' };
  const md5 = (value: string) => createHash('md5').update(value).digest('hex');
  let info: jest.Mock;
  let config: AppConfigType;
  let guard: IntegrationSignGuard;

  const contextFor = (query: object = {}, body?: object, logger?: object) =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({ query, body, method: 'GET', path: '/senlerGroups/345', logger }),
      }),
    }) as ExecutionContext;

  beforeEach(() => {
    info = jest.fn();
    config = { INTEGRATION_SECRET: secret } as AppConfigType;
    guard = new IntegrationSignGuard(config, { info } as unknown as Logger);
  });

  it.each([
    ['standard', `0012345Bot_step${secret}`],
    ['legacy_with_channel', `0012345Bot_step0${secret}`],
    ['legacy_without_context', `0012345${secret}`],
  ])('recognizes %s and always allows the request', (variant, input) => {
    expect(guard.canActivate(contextFor({ ...params, sign: md5(input) }))).toBe(true);
    expect(info).toHaveBeenCalledTimes(1);
    expect(info).toHaveBeenCalledWith('SIGN SUCCESS', expect.objectContaining({ variant, dryRun: true }));
    expect(JSON.stringify(info.mock.calls)).not.toContain(secret);
    expect(JSON.stringify(info.mock.calls)).not.toContain(md5(input));
  });

  it('uses the integration secret, not the Senler OAuth client secret', () => {
    config.SENLER_CLIENT_SECRET = 'different-oauth-secret';
    guard.canActivate(contextFor({ ...params, sign: md5(`0012345Bot_step${config.SENLER_CLIENT_SECRET}`) }));
    expect(info).toHaveBeenCalledWith('SIGN UNSUCCESS', expect.objectContaining({ reason: 'signature_mismatch' }));
  });

  it('supports legacy body.senlerSign and numeric IDs', () => {
    const body = { user_id: 12, senlerGroupId: 345, senlerSign: md5(`12345${secret}`) };
    expect(guard.canActivate(contextFor({}, body))).toBe(true);
    expect(info).toHaveBeenCalledWith('SIGN SUCCESS', expect.objectContaining({ variant: 'legacy_without_context' }));
  });

  it('keeps signed group_id separate from the internal template group UUID', () => {
    const query = { ...params, sign: md5(`0012345Bot_step${secret}`).toUpperCase() };
    guard.canActivate(contextFor(query, { senlerGroupId: 'internal-group-uuid' }));
    expect(info).toHaveBeenCalledWith('SIGN SUCCESS', expect.objectContaining({ variant: 'standard' }));
  });

  it.each([
    [{}, 'missing_sign'],
    [{ sign: '' }, 'missing_sign'],
    [{ sign: 'bad' }, 'invalid_sign_format'],
    [{ sign: ['a'.repeat(32)] }, 'invalid_sign_format'],
    [{ sign: 'g'.repeat(32) }, 'invalid_sign_format'],
    [{ sign: 'a'.repeat(32) }, 'missing_user_or_group'],
    [{ ...params, user_id: '', sign: 'a'.repeat(32) }, 'missing_user_or_group'],
    [{ ...params, group_id: ['345'], sign: 'a'.repeat(32) }, 'invalid_sign_params'],
    [{ ...params, context: { nested: 'Bot_step' }, sign: 'a'.repeat(32) }, 'invalid_sign_params'],
    [{ ...params, sign: 'a'.repeat(32) }, 'signature_mismatch'],
  ])('logs a failure and permits malformed/unsigned input %j', (query, reason) => {
    expect(guard.canActivate(contextFor(query))).toBe(true);
    expect(info).toHaveBeenCalledTimes(1);
    expect(info).toHaveBeenCalledWith('SIGN UNSUCCESS', expect.objectContaining({ reason, dryRun: true }));
  });

  it('does not synthesize missing context for a standard signature', () => {
    guard.canActivate(contextFor({ user_id: '0012', group_id: '345', sign: md5(`0012345Bot_step${secret}`) }));
    expect(info).toHaveBeenCalledWith('SIGN UNSUCCESS', expect.objectContaining({ reason: 'signature_mismatch' }));
  });

  it('allows requests when the secret is unavailable', () => {
    config.INTEGRATION_SECRET = undefined;
    expect(guard.canActivate(contextFor({ ...params, sign: 'a'.repeat(32) }))).toBe(true);
    expect(info).toHaveBeenCalledWith('SIGN UNSUCCESS', expect.objectContaining({ reason: 'missing_secret' }));
  });

  it('allows requests when verification throws', () => {
    Object.defineProperty(config, 'INTEGRATION_SECRET', {
      get: () => {
        throw new Error('test');
      },
    });
    expect(guard.canActivate(contextFor({ ...params, sign: 'a'.repeat(32) }))).toBe(true);
    expect(info).toHaveBeenCalledWith('SIGN UNSUCCESS', expect.objectContaining({ reason: 'verification_error' }));
  });

  it('uses the request logger for correlation and survives logging failures', () => {
    const requestInfo = jest.fn(() => {
      throw new Error('logging unavailable');
    });
    expect(guard.canActivate(contextFor({}, {}, { info: requestInfo }))).toBe(true);
    expect(requestInfo).toHaveBeenCalledWith('SIGN UNSUCCESS', expect.objectContaining({ reason: 'missing_sign' }));
    expect(info).not.toHaveBeenCalled();
  });
});
