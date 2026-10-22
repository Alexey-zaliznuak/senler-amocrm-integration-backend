import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { createHash } from 'crypto';
import request from 'supertest';
import { AppService } from '../../app.service';
import { IntegrationController } from '../../domain/integration/integration.controller';
import { IntegrationService } from '../../domain/integration/integration.service';
import { IntegrationStepTemplatesController } from '../../domain/integrationStepTemplates/integration-step-template.controller';
import { IntegrationStepTemplatesService } from '../../domain/integrationStepTemplates/integration-step-template.service';
import { SenlerGroupsController } from '../../domain/senlerGroups/senler-groups.controller';
import { SenlerGroupsService } from '../../domain/senlerGroups/senler-groups.service';
import { CONFIG } from '../config/config.module';
import { PRISMA } from '../database/database.config';
import { LOGGER } from '../logging/logging.config';

describe('Signature authorization HTTP coverage', () => {
  let app: INestApplication;
  const secret = 'test-senler-app-secret';
  const ownGroupId = '01234567-89ab-4cde-8fab-012345678901';
  const foreignGroupId = '01234567-89ab-4cde-8fab-012345678902';
  const ownTemplateId = '01234567-89ab-4cde-8fab-012345678903';
  const foreignTemplateId = '01234567-89ab-4cde-8fab-012345678904';
  const info = jest.fn();
  const signedParams = {
    user_id: '12',
    group_id: '345',
    context: 'Bot_step',
    channel_type_id: '0',
    sign: createHash('md5').update(`12345Bot_step${secret}`).digest('hex'),
  };
  const registration = {
    senlerGroupId: 345,
    amoCrmDomainName: 'example.amocrm.ru',
    amoCrmAuthorizationCode: 'amo-code',
    senlerAuthorizationCode: 'senler-code',
  };
  const service = {
    create: jest.fn().mockResolvedValue({ ok: true }),
    getByUniqueField: jest.fn().mockResolvedValue({ ok: true }),
    deleteByUniqueField: jest.fn().mockResolvedValue({ ok: true }),
    getById: jest.fn().mockResolvedValue({ ok: true }),
    update: jest.fn().mockResolvedValue({ ok: true }),
    deleteById: jest.fn().mockResolvedValue(undefined),
    changeAmoCrmAccount: jest.fn().mockResolvedValue(undefined),
    getAmoCrmWorkspaceInfo: jest.fn().mockResolvedValue({ ok: true }),
    getSenlerGroupErrorMessage: jest.fn().mockResolvedValue(''),
    deleteSenlerGroupErrorMessages: jest.fn().mockResolvedValue(undefined),
    processBotStepWebhook: jest.fn().mockResolvedValue({ ok: true }),
  };
  const prisma = {
    senlerGroup: {
      findUnique: jest.fn(async ({ where: { id } }) => {
        if (id === ownGroupId) return { senlerGroupId: 345 };
        if (id === foreignGroupId) return { senlerGroupId: 999 };
        return null;
      }),
    },
    integrationStepTemplate: {
      findUnique: jest.fn(async ({ where: { id } }) => {
        if (id === ownTemplateId) return { senlerGroup: { senlerGroupId: 345 } };
        if (id === foreignTemplateId) return { senlerGroup: { senlerGroupId: 999 } };
        return null;
      }),
    },
  };

  type Route = {
    method: 'get' | 'post' | 'delete' | 'patch';
    path: string;
    body?: object;
    status: number;
    handler: keyof typeof service;
  };
  const routes: Route[] = [
    { method: 'post', path: '/senlerGroups', body: registration, status: 201, handler: 'create' },
    { method: 'get', path: '/senlerGroups/345?field=senlerGroupId', status: 200, handler: 'getByUniqueField' },
    { method: 'delete', path: '/senlerGroups/345?field=senlerGroupId', status: 200, handler: 'deleteByUniqueField' },
    {
      method: 'delete',
      path: '/integration/change-amocrm-account',
      body: registration,
      status: 204,
      handler: 'changeAmoCrmAccount',
    },
    {
      method: 'get',
      path: '/integration/amocrm-workspace-info?senlerGroupId=345',
      status: 200,
      handler: 'getAmoCrmWorkspaceInfo',
    },
    { method: 'get', path: '/integration/AmoCrmErrors?senlerGroupId=345', status: 200, handler: 'getSenlerGroupErrorMessage' },
    {
      method: 'delete',
      path: '/integration/AmoCrmErrors?senlerGroupId=345',
      status: 204,
      handler: 'deleteSenlerGroupErrorMessages',
    },
    { method: 'get', path: `/integrationStepTemplates/${ownTemplateId}`, status: 200, handler: 'getById' },
    {
      method: 'post',
      path: '/integrationStepTemplates',
      body: { name: 'Template', settings: {}, senlerGroupId: ownGroupId },
      status: 201,
      handler: 'create',
    },
    {
      method: 'patch',
      path: `/integrationStepTemplates/${ownTemplateId}`,
      body: { name: 'Updated' },
      status: 201,
      handler: 'update',
    },
    { method: 'delete', path: `/integrationStepTemplates/${ownTemplateId}`, status: 200, handler: 'deleteById' },
  ];

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [SenlerGroupsController, IntegrationController, IntegrationStepTemplatesController],
      providers: [
        { provide: CONFIG, useValue: { INTEGRATION_SECRET: 'test-webhook-secret', SENLER_CLIENT_SECRET: secret } },
        { provide: LOGGER, useValue: { info } },
        { provide: PRISMA, useValue: prisma },
        ...[SenlerGroupsService, IntegrationService, IntegrationStepTemplatesService].map(provide => ({
          provide,
          useValue: service,
        })),
      ],
    }).compile();
    app = module.createNestApplication();
    AppService.setupValidation(app);
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
  });
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it.each(routes)('allows a valid signature for $method $path', async ({ method, path, body, status, handler }) => {
    await request(app.getHttpServer())[method](path).query(signedParams).send(body).expect(status);
    expect(service[handler]).toHaveBeenCalledTimes(1);
    expect(info).toHaveBeenCalledTimes(1);
    expect(info).toHaveBeenCalledWith('SIGN SUCCESS', expect.objectContaining({ variant: 'standard', dryRun: false }));
    if (handler === 'getById') expect(service.getById).toHaveBeenCalledWith(ownTemplateId);
  });

  for (const invalidParams of [{}, { ...signedParams, sign: 'a'.repeat(32) }]) {
    it.each(routes)(
      `rejects ${'sign' in invalidParams ? 'invalid' : 'missing'} signatures for $method $path`,
      async ({ method, path, body }) => {
        await request(app.getHttpServer())[method](path).query(invalidParams).send(body).expect(403);
        for (const handler of Object.values(service)) expect(handler).not.toHaveBeenCalled();
        expect(prisma.senlerGroup.findUnique).not.toHaveBeenCalled();
        expect(prisma.integrationStepTemplate.findUnique).not.toHaveBeenCalled();
        expect(info).toHaveBeenCalledTimes(1);
        expect(info).toHaveBeenCalledWith('SIGN UNSUCCESS', expect.objectContaining({ dryRun: false }));
      }
    );
  }

  it.each(routes)('rejects a foreign resource for $method $path', async ({ method, path, body }) => {
    const foreignPath = path.replace(ownTemplateId, foreignTemplateId).replace(/\b345\b/g, '999');
    const foreignBody = body && {
      ...body,
      ...('senlerGroupId' in body ? { senlerGroupId: body.senlerGroupId === ownGroupId ? foreignGroupId : 999 } : {}),
    };
    await request(app.getHttpServer())[method](foreignPath).query(signedParams).send(foreignBody).expect(403);
    for (const handler of Object.values(service)) expect(handler).not.toHaveBeenCalled();
    expect(info).toHaveBeenCalledWith('SIGN UNSUCCESS', expect.objectContaining({ reason: 'resource_not_in_group' }));
  });

  it.each(['get', 'delete'] as const)('resolves group ownership by UUID for %s', async method => {
    await request(app.getHttpServer())[method](`/senlerGroups/${ownGroupId}?field=id`).query(signedParams).expect(200);
    await request(app.getHttpServer())[method](`/senlerGroups/${foreignGroupId}?field=id`).query(signedParams).expect(403);
    expect(prisma.senlerGroup.findUnique).toHaveBeenCalledWith({ where: { id: ownGroupId }, select: { senlerGroupId: true } });
  });

  it.each([
    '/senlerGroups/345?field=amoCrmProfileId',
    '/senlerGroups/345?field=senlerGroupId&field=id',
    '/senlerGroups/345',
    '/senlerGroups/missing?field=id',
    '/integrationStepTemplates/missing',
    '/integration/AmoCrmErrors?senlerGroupId=345&senlerGroupId=999',
  ])('rejects ambiguous, unsupported or missing resource %s', async path => {
    await request(app.getHttpServer()).get(path).query(signedParams).expect(403);
    for (const handler of Object.values(service)) expect(handler).not.toHaveBeenCalled();
  });

  it('accepts the existing registration body alias before validation strips signing fields', async () => {
    await request(app.getHttpServer())
      .post('/senlerGroups')
      .send({
        ...registration,
        user_id: 12,
        senlerSign: createHash('md5').update(`12345${secret}`).digest('hex'),
      })
      .expect(201);
    expect(service.create).toHaveBeenCalledWith(expect.objectContaining({ senlerGroupId: 345 }));
    expect(service.create.mock.calls[0][0]).not.toHaveProperty('senlerSign');
    expect(info).toHaveBeenCalledWith('SIGN SUCCESS', expect.objectContaining({ variant: 'legacy_without_context' }));
  });

  it('does not let a body group override the owner of a template', async () => {
    await request(app.getHttpServer())
      .patch(`/integrationStepTemplates/${foreignTemplateId}`)
      .query(signedParams)
      .send({ name: 'Updated', senlerGroupId: ownGroupId })
      .expect(403);
    expect(service.update).not.toHaveBeenCalled();
  });

  it('blocks requests when ownership lookup throws', async () => {
    prisma.integrationStepTemplate.findUnique.mockRejectedValueOnce(new Error('database unavailable'));
    await request(app.getHttpServer()).get(`/integrationStepTemplates/${ownTemplateId}`).query(signedParams).expect(403);
    expect(service.getById).not.toHaveBeenCalled();
    expect(info).toHaveBeenCalledWith('SIGN UNSUCCESS', expect.objectContaining({ reason: 'verification_error' }));
  });

  it('retains webhook authorization without applying the iframe guard', async () => {
    await request(app.getHttpServer()).post('/integration/botStepWebhook').send({}).expect(403);
    await request(app.getHttpServer())
      .post('/integration/botStepWebhook')
      .send({})
      .set('x-integration-secret', secret)
      .expect(403);
    await request(app.getHttpServer())
      .post('/integration/botStepWebhook')
      .send({})
      .set('x-integration-secret', 'test-webhook-secret')
      .expect(200);
    expect(info).not.toHaveBeenCalled();
    expect(service.processBotStepWebhook).toHaveBeenCalledTimes(1);
  });
});
