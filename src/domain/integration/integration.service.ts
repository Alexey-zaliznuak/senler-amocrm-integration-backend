import { Injectable } from '@nestjs/common';
import { SenlerApiClient } from 'senler-sdk';
import { AmoCrmService, AmoCrmTokens } from 'src/external/amo-crm';
import { prisma } from 'src/infrastructure/database';
import { CustomRequest } from 'src/infrastructure/requests';
import { BotStepType, BotStepWebhookDto } from './integration.dto';

@Injectable()
export class IntegrationService {
  constructor(private readonly amoCrmService: AmoCrmService) {}

  async processBotStepWebhook(req: CustomRequest, body: BotStepWebhookDto) {
    const senlerGroup = await prisma.senlerGroup.findUniqueOrThrow({ where: { senlerGroupId: body.senlerGroupId } });

    const tokens: AmoCrmTokens = {
      amoCrmAccessToken: senlerGroup.amoCrmAccessToken,
      amoCrmRefreshToken: senlerGroup.amoCrmRefreshToken,
    };

    await this.createLeadIfNotExists({
      senlerLeadId: body.lead.id,
      name: body.lead.name,
      senlerGroupId: body.senlerGroupId,
      amoCrmDomainName: senlerGroup.amoCrmDomainName,
      tokens,
    });

    const lead = await prisma.lead.findUniqueOrThrow({
      where: { senlerLeadId: body.lead.id },
      include: { senlerGroup: true },
    });

    const senlerClient = new SenlerApiClient({
      accessToken: lead.senlerGroup.senlerAccessToken,
      vkGroupId: body.senlerVkGroupId,
    });

    if (body.publicBotStepSettings.type == BotStepType.SendDataToAmoCrm) {
      this.sendVarsToAmo({
        senlerLeadId: body.lead.id,
        amoCrmDomainName: senlerGroup.amoCrmDomainName,
        tokens,
        syncableVariables: body.publicBotStepSettings.syncableVariables,
        senlerLeadVars: body.lead.personalVars,
      });
      return {};
    }
    if (body.publicBotStepSettings.type == BotStepType.SendDataToSenler) {
      const amoCrmVariablesIds = body.publicBotStepSettings.syncableVariables.forEach((value, _index) => value.from);
      const amoCrmLead = await this.amoCrmService.getLeadById({tokens, amoCrmDomainName: senlerGroup.amoCrmDomainName, leadId: lead.amoCrmLeadId })

    }
  }

  async sendVarsToAmo({
    senlerLeadId,
    amoCrmDomainName,
    tokens,
    syncableVariables,
    senlerLeadVars,
  }: {
    tokens: AmoCrmTokens;
    senlerLeadId: string;
    amoCrmDomainName: string;
    syncableVariables: any;
    senlerLeadVars: any;
  }) {
    const amoCrmLeadId = (await prisma.lead.findFirst({ where: { senlerLeadId } }))?.amoCrmLeadId;

    // const senlerVariables = body.publicBotStepSettings.syncableVariables.forEach((value, _index) => value.from);

    const customFieldsValues = SenlerVarsToAmoFields(syncableVariables, senlerLeadVars);

    await this.amoCrmService.editLeadsById({
      amoCrmDomainName,
      amoCrmLeadId,
      tokens,
      customFieldsValues,
    });
  }

  async createLeadIfNotExists({
    senlerLeadId,
    senlerGroupId,
    name,
    tokens,
    amoCrmDomainName,
  }: {
    senlerLeadId: string;
    senlerGroupId: string;
    name: string;
    tokens: AmoCrmTokens;
    amoCrmDomainName: string;
  }) {
    const amoCrmLeadId = (await prisma.lead.findFirst({ where: { senlerLeadId } }))?.amoCrmLeadId;

    if (await prisma.lead.exists({ amoCrmLeadId, senlerLeadId })) {
      const actualAmoCrmLead = await this.amoCrmService.createLeadIfNotExists({
        amoCrmDomainName,
        amoCrmLeadId,
        name,
        tokens,
      });

      if (amoCrmLeadId != actualAmoCrmLead.id) {
        await prisma.lead.update({
          where: { amoCrmLeadId, senlerLeadId },
          data: { amoCrmLeadId: actualAmoCrmLead.id },
        });
      }
      return;
    }

    const lead = await this.amoCrmService.addLead({
      amoCrmDomainName,
      leads: [{ name }],
      tokens,
    });

    await prisma.lead.create({
      data: {
        amoCrmLeadId: lead.id,
        senlerLeadId: senlerLeadId,
        senlerGroupId: senlerGroupId,
      },
    });
  }
}

function SenlerVarsToAmoFields(syncableVariables: any, senlerLeadVars: any): any {
  throw new Error(`Function not implemented. syncableVariables: ${syncableVariables} senlerLeadVars: ${senlerLeadVars}`);
}
