import { Injectable } from '@nestjs/common';
import { SenlerApiClient } from 'senler-sdk';
import { AmoCrmService, AmoCrmToken } from 'src/external/amo-crm';
import { prisma } from 'src/infrastructure/database';
import { CustomRequest } from 'src/infrastructure/requests';
import { BotStepType, BotStepWebhookDto } from './integration.dto';

@Injectable()
export class IntegrationService {
  constructor(private readonly amoCrmService: AmoCrmService) {}

  async processBotStepWebhook(req: CustomRequest, body: BotStepWebhookDto) {
    const senlerGroup = await prisma.senlerGroup.findFirst({ where: { senlerVkGroupId: body.lead.senlerGroupId } });

    const token: AmoCrmToken = {
      amoCrmAccessToken: senlerGroup.amoCrmAccessToken,
      amoCrmRefreshToken: senlerGroup.amoCrmRefreshToken,
    };

    await this.createLeadIfNotExists({
      senlerLeadId: body.lead.id,
      name: body.lead.name,
      senlerGroupId: body.lead.senlerGroupId,
      amoCrmDomain: senlerGroup.amoCrmDomainName,
      token,
    });

    const lead = await prisma.lead.findUniqueOrThrow({
      where: { senlerLeadId: body.lead.id },
      select: { senlerGroup: true },
    });

    const senlerClient = new SenlerApiClient({
      accessToken: lead.senlerGroup.senlerAccessToken,
      vkGroupId: lead.senlerGroup.senlerVkGroupId,
    });

    if (body.publicBotStepSettings.type == BotStepType.SendDataToAmoCrm) {
      const senlerVariables = body.publicBotStepSettings.syncableVariables.forEach((value, _index) => value.from);
      //await senlerClient.vars.get({vk_user_id: body.lead.vkUserId})
      // console.info(temp)
      return {};
    }
    if (body.publicBotStepSettings.type == BotStepType.SendDataToSenler) {
      // const _amoCrmVariables = body.publicBotStepSettings.syncableVariables.forEach(
      //     (value, _index) => value.from,
      //   );
    }
  }

  // publicBotStepSettings

  async createLeadIfNotExists({
    senlerLeadId,
    senlerGroupId,
    name,
    token,
    amoCrmDomain,
  }: {
    senlerLeadId: string;
    senlerGroupId: string;
    name: string;
    token: AmoCrmToken;
    amoCrmDomain: string;
  }) {
    const amoCrmLeadId = (await prisma.lead.findFirst({ where: { senlerLeadId } }))?.amoCrmLeadId;

    if (await prisma.lead.exists({ amoCrmLeadId, senlerLeadId })) {
      const actualAmoCrmLead = await this.amoCrmService.createLeadIfNotExists({
        amoCrmDomain,
        amoCrmLeadId,
        name,
        token,
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
      amoCrmDomain,
      leads: [{ name }],
      token,
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
