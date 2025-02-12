import { Injectable } from '@nestjs/common';
import { Lead, SenlerGroup } from '@prisma/client';
import { AmoCrmService, AmoCrmTokens } from 'src/external/amo-crm';
import { AppConfig } from 'src/infrastructure/config/config.app-config';
import { prisma } from 'src/infrastructure/database';
import { LoggingService } from 'src/infrastructure/logging/logging.service';
import { CustomRequest } from 'src/infrastructure/requests';
import { BotStepType, BotStepWebhookDto, GetSenlerGroupFieldsDto } from './integration.dto';
import { IntegrationUtils } from './integration.utils';

@Injectable()
export class IntegrationService {
  private readonly utils = new IntegrationUtils();

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

    if (body.publicBotStepSettings.type == BotStepType.SendDataToAmoCrm) {
      return await this.sendVarsToAmoCrm(body, tokens, lead);
    }
    if (body.publicBotStepSettings.type == BotStepType.SendDataToSenler) {
      return await this.sendVarsToSenler(body, tokens, lead);
    }
  }

  async sendVarsToAmoCrm(body: BotStepWebhookDto, tokens: AmoCrmTokens, lead: Lead & { senlerGroup: SenlerGroup }) {
    const customFieldsValues = this.utils.convertSenlerVarsToAmoFields(
      body.publicBotStepSettings.syncableVariables,
      body.lead.personalVars
    );

    await this.amoCrmService.editLeadsById({
      amoCrmDomainName: lead.senlerGroup.amoCrmDomainName,
      amoCrmLeadId: lead.amoCrmLeadId,
      tokens,
      customFieldsValues,
    });
  }

  async sendVarsToSenler(body: BotStepWebhookDto, tokens: AmoCrmTokens, lead: Lead & { senlerGroup: SenlerGroup }) {
    const amoCrmLead = await this.amoCrmService.getLeadById({
      leadId: lead.amoCrmLeadId,
      amoCrmDomainName: lead.senlerGroup.amoCrmDomainName,
      tokens: {
        amoCrmAccessToken: lead.senlerGroup.amoCrmAccessToken,
        amoCrmRefreshToken: lead.senlerGroup.amoCrmRefreshToken,
      },
    });

    const logger = new LoggingService(AppConfig).createLogger();
    // logger.debug('customFieldsValues ', customFieldsValues);
  }

  async createLeadIfNotExists({
    senlerLeadId,
    senlerGroupId,
    name,
    tokens,
    amoCrmDomainName,
  }: {
    senlerLeadId: string;
    senlerGroupId: number;
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
        senlerGroup: {
          connect: {
            senlerGroupId,
          },
        },
      },
    });
  }

  async getAmoCrmFields(req: CustomRequest, body: GetSenlerGroupFieldsDto) {
    const senlerGroup = await prisma.senlerGroup.findUniqueOrThrow({ where: { senlerSign: body.sign } });

    const tokens: AmoCrmTokens = {
      amoCrmAccessToken: senlerGroup.amoCrmAccessToken,
      amoCrmRefreshToken: senlerGroup.amoCrmRefreshToken,
    };

    const leadFields = await this.amoCrmService.getLeadFields({
      amoCrmDomainName: senlerGroup.amoCrmDomainName,
      tokens,
    });

    return leadFields;
  }
}
