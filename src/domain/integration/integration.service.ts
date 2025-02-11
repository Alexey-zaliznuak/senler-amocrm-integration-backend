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
      await this.sendVarsToAmo({
        senlerLeadId: body.lead.id,
        amoCrmDomainName: senlerGroup.amoCrmDomainName,
        tokens,
        syncableVariables: body.publicBotStepSettings.syncableVariables,
        senlerLeadVars: body.lead.personalVars,
      });
      return {};
    }
    if (body.publicBotStepSettings.type == BotStepType.SendDataToSenler) {
      await this.sendVarsToSenler(body, tokens, lead);
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
    const customFieldsValues = this.utils.senlerVarsToAmoFields(syncableVariables, senlerLeadVars);
    const amoCrmLeadId = (await prisma.lead.findUniqueOrThrow({ where: { senlerLeadId } })).amoCrmLeadId;

    await this.amoCrmService.editLeadsById({
      amoCrmDomainName,
      amoCrmLeadId,
      tokens,
      customFieldsValues,
    });
  }

  async sendVarsToSenler(body: BotStepWebhookDto, tokens: AmoCrmTokens, lead: Lead & { senlerGroup: SenlerGroup }) {
    const amoCrmLeadId = (await prisma.lead.findUniqueOrThrow({ where: { senlerLeadId: body.lead.id } })).amoCrmLeadId;
    const customFieldsValues = this.utils.senlerVarsToAmoFields(
      body.publicBotStepSettings.syncableVariables,
      body.lead.personalVars
    );

    const logger = new LoggingService(AppConfig).createLogger();
    logger.debug('customFieldsValues ', customFieldsValues);

    await this.amoCrmService.editLeadsById({
      amoCrmDomainName: lead.senlerGroup.amoCrmDomainName,
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
