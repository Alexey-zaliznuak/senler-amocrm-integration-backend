import { Injectable } from '@nestjs/common';
import { AmoCrmService } from 'src/external/amo-crm';
import { prisma } from 'src/infrastructure/database';
import { CustomRequest } from 'src/infrastructure/requests';
import { BotStepType, BotStepWebhookDto } from './integration.dto';
import { SenlerApiClient } from 'senler-sdk';

@Injectable()
export class IntegrationService {
  constructor(private readonly amoCrmService: AmoCrmService) {}

  async processBotStepWebhook(req: CustomRequest, body: BotStepWebhookDto) {
    // create lead if not exists
    const lead = await prisma.lead.findUniqueOrThrow({where: {senlerLeadId: body.lead.id}, select: {senlerGroup: true}})

    const senlerClient = new SenlerApiClient({
      accessToken: lead.senlerGroup.senlerAccessToken,
      vkGroupId: lead.senlerGroup.senlerVkGroupId,
    })

    if (body.publicBotStepSettings.type == BotStepType.SendDataToAmoCrm) {
      const senlerVariables = body.publicBotStepSettings.syncableVariables.forEach((value, _index) => value.from)
      //await senlerClient.vars.get({vk_user_id: body.lead.vkUserId})
      // console.info(temp)
      return {}
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
    amoCrmLeadId,
    name,
    amoCrmDomain,
  }: {
    senlerLeadId: string;
    amoCrmLeadId: number;
    name: string;
    amoCrmDomain: string;
  }) {
    const databaseLead = +(
      await prisma.lead.findUnique({
        where: {
          amoCrmLeadId,
          senlerLeadId,
        },
      })
    ).id;

    const actualLead = databaseLead
      ? await this.amoCrmService.addLead({ amoCrmDomain, leads: [{ name }] })
      : await this.amoCrmService.createLeadIfNotExists({
          amoCrmDomain,
          amoCrmLeadId,
          name,
        });

    if (amoCrmLeadId != actualLead) {
      // обновить
    }
  }
}
