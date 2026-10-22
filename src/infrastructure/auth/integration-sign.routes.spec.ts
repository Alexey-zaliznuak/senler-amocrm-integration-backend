import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { createHash } from 'crypto';
import request from 'supertest';
import { IntegrationController } from '../../domain/integration/integration.controller';
import { IntegrationService } from '../../domain/integration/integration.service';
import { IntegrationStepTemplatesController } from '../../domain/integrationStepTemplates/integration-step-template.controller';
import { IntegrationStepTemplatesService } from '../../domain/integrationStepTemplates/integration-step-template.service';
import { SenlerGroupsController } from '../../domain/senlerGroups/senler-groups.controller';
import { SenlerGroupsService } from '../../domain/senlerGroups/senler-groups.service';
import { CONFIG } from '../config/config.module';
import { LOGGER } from '../logging/logging.config';

describe('Signature audit HTTP coverage', () => {
  let app: INestApplication;
  const info = jest.fn();
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

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [SenlerGroupsController, IntegrationController, IntegrationStepTemplatesController],
      providers: [
        { provide: CONFIG, useValue: { INTEGRATION_SECRET: 'test-secret', SENLER_CLIENT_SECRET: 'test-senler-app-secret' } },
        { provide: LOGGER, useValue: { info } },
        ...[SenlerGroupsService, IntegrationService, IntegrationStepTemplatesService].map(provide => ({
          provide,
          useValue: service,
        })),
      ],
    }).compile();
    app = module.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
  });
  beforeEach(() => {
    info.mockClear();
  });

  it.each([
    ['post', '/senlerGroups', 201],
    ['get', '/senlerGroups/123?field=senlerGroupId', 200],
    ['delete', '/senlerGroups/123?field=senlerGroupId', 200],
    ['delete', '/integration/change-amocrm-account', 204],
    ['get', '/integration/amocrm-workspace-info?senlerGroupId=123', 200],
    ['get', '/integration/AmoCrmErrors?senlerGroupId=123', 200],
    ['delete', '/integration/AmoCrmErrors?senlerGroupId=123', 204],
    ['get', '/integrationStepTemplates/template-id', 200],
    ['post', '/integrationStepTemplates', 201],
    ['patch', '/integrationStepTemplates/template-id', 201],
    ['delete', '/integrationStepTemplates/template-id', 200],
  ] as const)('audits %s %s once without blocking it', async (method, path, status) => {
    await request(app.getHttpServer())[method](path).expect(status);
    expect(info).toHaveBeenCalledTimes(1);
    expect(info).toHaveBeenCalledWith('SIGN UNSUCCESS', expect.objectContaining({ reason: 'missing_sign' }));
  });

  it('verifies iframe signatures with the Senler application secret', async () => {
    const sign = createHash('md5').update('12345Bot_steptest-senler-app-secret').digest('hex');
    await request(app.getHttpServer())
      .get('/senlerGroups/345')
      .query({ field: 'senlerGroupId', user_id: '12', group_id: '345', context: 'Bot_step', sign })
      .expect(200);
    expect(info).toHaveBeenCalledTimes(1);
    expect(info).toHaveBeenCalledWith('SIGN SUCCESS', expect.objectContaining({ variant: 'standard', dryRun: true }));
  });

  it('retains webhook authorization without applying the iframe guard', async () => {
    await request(app.getHttpServer()).post('/integration/botStepWebhook').send({}).expect(403);
    await request(app.getHttpServer())
      .post('/integration/botStepWebhook')
      .send({})
      .set('x-integration-secret', 'test-senler-app-secret')
      .expect(403);
    await request(app.getHttpServer())
      .post('/integration/botStepWebhook')
      .send({})
      .set('x-integration-secret', 'test-secret')
      .expect(200);
    expect(info).not.toHaveBeenCalled();
  });
});
