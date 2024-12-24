import { Injectable } from '@nestjs/common';
import { AmoCrmService } from 'src/external/amo-crm';
import { prisma } from 'src/infrastructure/database';
import { CustomRequest } from 'src/infrastructure/requests';
import { BotStepType, BotStepWebhookDto } from './integration.dto';
import { SenlerService } from 'src/external/senler/senler.service';

@Injectable()
export class IntegrationService {
  constructor(
    private readonly amoCrmService: AmoCrmService,
    private readonly senlerService: SenlerService,
  ) {}

  async processBotStepWebhook(req: CustomRequest, body: BotStepWebhookDto) {
    if (body.publicBotStepSettings.type == BotStepType.SendDataToAmoCrm) {

    }
    if (body.publicBotStepSettings.type == BotStepType.SendDataToSenler) {
      const amoCrmVariables = body.publicBotStepSettings.syncableVariables.forEach((value, _index) => value.from)
    }
  }

  async createLeadIfNotExists({
    senlerLeadId,
    amoCrmLeadId,
    name,
    amoCrmDomain,
  }: {
    senlerLeadId: number;
    amoCrmLeadId: number;
    name: string;
    amoCrmDomain: string;
  }) {
    const databaseLead = +(
      await prisma.lead.findUnique({
        where: {
          amoCrmLeadId,
          senlerLeadId
        },
      })
    ).id;

    const actualLead = databaseLead ?
    await this.amoCrmService.addLead({amoCrmDomain,leads: [{ name }],})
    : await this.amoCrmService.createLeadIfNotExists({amoCrmDomain, amoCrmLeadId, name,});

    if (amoCrmLeadId != actualLead) {
      // обновить
    }
  }
}
