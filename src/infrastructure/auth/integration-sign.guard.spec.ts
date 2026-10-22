import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { createHash } from 'crypto';
import { Logger } from 'winston';
import { AppConfigType } from '../config/config.app-config';
import { PrismaExtendedClientType } from '../database/database.service';
import { IntegrationSignGuard } from './integration-sign.guard';

describe('IntegrationSignGuard', () => {
  const secret = 'test-senler-app-secret';
  const params = { user_id: '0012', group_id: '345', context: 'Bot_step', channel_type_id: '0' };
  const md5 = (value: string) => createHash('md5').update(value).digest('hex');
  let info: jest.Mock;
  let config: AppConfigType;
  let guard: IntegrationSignGuard;
  const prisma = { senlerGroup: { findUnique: jest.fn() }, integrationStepTemplate: { findUnique: jest.fn() } };
  const reflector = { getAllAndOverride: jest.fn() };

  const contextFor = (query: object = {}, body?: object, logger?: object) =>
    ({
      getHandler: () => function handler() {},
      getClass: () => class Controller {},
      switchToHttp: () => ({
        getRequest: () => ({
          query: { field: 'senlerGroupId', ...query },
          body,
          method: 'GET',
          path: '/senlerGroups/345',
          params: { identifier: '345' },
          logger,
        }),
      }),
    }) as unknown as ExecutionContext;

  beforeEach(() => {
    info = jest.fn();
    jest.resetAllMocks();
    reflector.getAllAndOverride.mockReturnValue('group-identifier');
    prisma.senlerGroup.findUnique.mockResolvedValue({ senlerGroupId: 345 });
    config = { SENLER_CLIENT_SECRET: secret, INTEGRATION_SECRET: 'different-webhook-secret' } as AppConfigType;
    guard = new IntegrationSignGuard(
      config,
      { info } as unknown as Logger,
      prisma as unknown as PrismaExtendedClientType,
      reflector as unknown as Reflector
    );
  });

  it.each([
    ['standard', `0012345Bot_step${secret}`],
    ['legacy_with_channel', `0012345Bot_step0${secret}`],
    ['legacy_without_context', `0012345${secret}`],
  ])('recognizes %s and allows access to the signed group', async (variant, input) => {
    await expect(guard.canActivate(contextFor({ ...params, sign: md5(input) }))).resolves.toBe(true);
    expect(info).toHaveBeenCalledTimes(1);
    expect(info).toHaveBeenCalledWith('SIGN SUCCESS', expect.objectContaining({ variant, dryRun: false }));
    expect(JSON.stringify(info.mock.calls)).not.toContain(secret);
    expect(JSON.stringify(info.mock.calls)).not.toContain(md5(input));
  });

  it.each(['0012345Bot_step', '0012345Bot_step0', '0012345'])(
    'does not accept a webhook-secret signature for %s',
    async prefix => {
      await expect(
        guard.canActivate(contextFor({ ...params, sign: md5(`${prefix}${config.INTEGRATION_SECRET}`) }))
      ).resolves.toBe(false);
      expect(info).toHaveBeenCalledWith('SIGN UNSUCCESS', expect.objectContaining({ reason: 'signature_mismatch' }));
    }
  );

  it('supports legacy body.senlerSign and numeric IDs', async () => {
    const body = { user_id: 12, senlerGroupId: 345, senlerSign: md5(`12345${secret}`) };
    await expect(guard.canActivate(contextFor({}, body))).resolves.toBe(true);
    expect(info).toHaveBeenCalledWith('SIGN SUCCESS', expect.objectContaining({ variant: 'legacy_without_context' }));
  });

  it('keeps signed group_id separate from the internal template group UUID', async () => {
    reflector.getAllAndOverride.mockReturnValue('template-body');
    const query = { ...params, sign: md5(`0012345Bot_step${secret}`).toUpperCase() };
    await expect(guard.canActivate(contextFor(query, { senlerGroupId: 'internal-group-uuid' }))).resolves.toBe(true);
    expect(prisma.senlerGroup.findUnique).toHaveBeenCalledWith({
      where: { id: 'internal-group-uuid' },
      select: { senlerGroupId: true },
    });
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
  ])('logs a failure and rejects malformed/unsigned input %j', async (query, reason) => {
    await expect(guard.canActivate(contextFor(query))).resolves.toBe(false);
    expect(info).toHaveBeenCalledTimes(1);
    expect(info).toHaveBeenCalledWith('SIGN UNSUCCESS', expect.objectContaining({ reason, dryRun: false }));
    expect(prisma.senlerGroup.findUnique).not.toHaveBeenCalled();
    expect(prisma.integrationStepTemplate.findUnique).not.toHaveBeenCalled();
  });

  it('does not synthesize missing context for a standard signature', async () => {
    await expect(
      guard.canActivate(contextFor({ user_id: '0012', group_id: '345', sign: md5(`0012345Bot_step${secret}`) }))
    ).resolves.toBe(false);
    expect(info).toHaveBeenCalledWith('SIGN UNSUCCESS', expect.objectContaining({ reason: 'signature_mismatch' }));
  });

  it('denies requests when the secret is unavailable', async () => {
    config.SENLER_CLIENT_SECRET = undefined;
    await expect(guard.canActivate(contextFor({ ...params, sign: 'a'.repeat(32) }))).resolves.toBe(false);
    expect(info).toHaveBeenCalledWith('SIGN UNSUCCESS', expect.objectContaining({ reason: 'missing_secret' }));
  });

  it('denies requests when verification throws', async () => {
    Object.defineProperty(config, 'SENLER_CLIENT_SECRET', {
      get: () => {
        throw new Error('test');
      },
    });
    await expect(guard.canActivate(contextFor({ ...params, sign: 'a'.repeat(32) }))).resolves.toBe(false);
    expect(info).toHaveBeenCalledWith('SIGN UNSUCCESS', expect.objectContaining({ reason: 'verification_error' }));
  });

  it.each([true, false])('preserves authorization result %s when the request logger throws', async valid => {
    const requestInfo = jest.fn(() => {
      throw new Error('logging unavailable');
    });
    const query = valid ? { ...params, sign: md5(`0012345Bot_step${secret}`) } : {};
    await expect(guard.canActivate(contextFor(query, {}, { info: requestInfo }))).resolves.toBe(valid);
    expect(requestInfo).toHaveBeenCalledWith(valid ? 'SIGN SUCCESS' : 'SIGN UNSUCCESS', expect.any(Object));
    expect(info).not.toHaveBeenCalled();
  });

  it('denies requests when ownership verification fails', async () => {
    reflector.getAllAndOverride.mockReturnValue('template-body');
    prisma.senlerGroup.findUnique.mockRejectedValue(new Error('database unavailable'));
    await expect(
      guard.canActivate(
        contextFor(
          { ...params, sign: md5(`0012345Bot_step${secret}`) },
          {
            senlerGroupId: 'internal-group-uuid',
          }
        )
      )
    ).resolves.toBe(false);
    expect(info).toHaveBeenCalledWith('SIGN UNSUCCESS', expect.objectContaining({ reason: 'verification_error' }));
  });

  it('denies requests without an explicit resource scope', async () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);
    await expect(guard.canActivate(contextFor({ ...params, sign: md5(`0012345Bot_step${secret}`) }))).resolves.toBe(false);
  });

  it.each(['0', '-1', 'NaN', '9007199254740992'])('rejects an invalid signed group ID %s', async groupId => {
    await expect(
      guard.canActivate(
        contextFor({
          ...params,
          group_id: groupId,
          sign: md5(`0012${groupId}Bot_step${secret}`),
        })
      )
    ).resolves.toBe(false);
    expect(info).toHaveBeenCalledWith('SIGN UNSUCCESS', expect.objectContaining({ reason: 'invalid_group_id' }));
  });
});
