import { Injectable } from '@nestjs/common';
import { AmoCrmService } from 'src/external/amo-crm';
import { prisma } from 'src/infrastructure/database';

@Injectable()
export class IntegrationService {
  constructor(private readonly amoCrmService: AmoCrmService) {}

  // async processBotStepWebhook(req: CustomRequest, body: BotStepWebhookDto) {
  //   // create lead if not exists
  //   const lead = await prisma.lead.findUniqueOrThrow({
  //     where: { senlerLeadId: body.lead.id },
  //     select: { senlerGroup: true },
  //   });

  //   const senlerClient = new SenlerApiClient({
  //     accessToken: lead.senlerGroup.senlerAccessToken,
  //     vkGroupId: lead.senlerGroup.senlerVkGroupId,
  //   });

  //   if (body.publicBotStepSettings.type == BotStepType.SendDataToAmoCrm) {
  //     const senlerVariables =
  //       body.publicBotStepSettings.syncableVariables.forEach(
  //         (value, _index) => value.from,
  //       );
  //     //await senlerClient.vars.get({vk_user_id: body.lead.vkUserId})
  //     // console.info(temp)
  //     return {};
  //   }
  //   if (body.publicBotStepSettings.type == BotStepType.SendDataToSenler) {
  //     // const _amoCrmVariables = body.publicBotStepSettings.syncableVariables.forEach(
  //     //     (value, _index) => value.from,
  //     //   );
  //   }
  // }
  // publicBotStepSettings

  async createLeadIfNotExists({
    senlerLeadId,
    amoCrmLeadId,
    name,
    amoCrmDomain,
    senlerGroupId,
  }: {
    senlerLeadId: string;
    amoCrmLeadId: number;
    name: string;
    amoCrmDomain: string;
    senlerGroupId: string;
  }) {
    const databaseLead = await prisma.lead.findUnique({
      where: {
        amoCrmLeadId,
        senlerLeadId,
      },
    });

    if (databaseLead.id) {
      const actualLead = await this.amoCrmService.createLeadIfNotExists({
        amoCrmDomain,
        amoCrmLeadId,
        name,
      });
      if (amoCrmLeadId != actualLead.id) {
        prisma.lead.update({
          where: { amoCrmLeadId, senlerLeadId },
          data: { amoCrmLeadId: actualLead.id },
        });
      }
      return;
    }

    const actualLead = await this.amoCrmService.addLead({
      amoCrmDomain,
      leads: [{ name }],
    });
    prisma.lead.create({
      data: {
        amoCrmLeadId: actualLead.id,
        senlerLeadId: senlerLeadId,
        senlerGroupId: senlerGroupId,
      },
    });
  }
}
