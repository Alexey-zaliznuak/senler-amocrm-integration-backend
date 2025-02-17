import { Inject, Injectable } from '@nestjs/common';
import { Lead, SenlerGroup } from '@prisma/client';
import { AmoCrmService, AmoCrmTokens } from 'src/external/amo-crm';
import { GetLeadResponse as AmoCrmLead } from 'src/external/amo-crm/amo-crm.dto';
import { prisma } from 'src/infrastructure/database';
import { CustomRequest } from 'src/infrastructure/requests';
import { BotStepType, BotStepWebhookDto, GetSenlerGroupFieldsDto } from './integration.dto';
import { IntegrationUtils } from './integration.utils';
import { Logger } from 'winston';
import { LOGGER_INJECTABLE_NAME } from './integration.config';

@Injectable()
export class IntegrationService {
  private readonly utils = new IntegrationUtils();

  constructor(
    private readonly amoCrmService: AmoCrmService,
    @Inject(LOGGER_INJECTABLE_NAME) private readonly logger: Logger
  ) {}

  async processBotStepWebhook(req: CustomRequest, body: BotStepWebhookDto) {
    const senlerGroup = await prisma.senlerGroup.findUniqueOrThrow({ where: { senlerGroupId: body.senlerGroupId } });

    const tokens: AmoCrmTokens = {
      amoCrmAccessToken: senlerGroup.amoCrmAccessToken,
      amoCrmRefreshToken: senlerGroup.amoCrmRefreshToken,
    };

    const { lead, amoCrmLead } = await this.getOrCreateLeadIfNotExists({
      senlerLeadId: body.lead.id,
      name: body.lead.name,
      senlerGroupId: body.senlerGroupId,
      amoCrmDomainName: senlerGroup.amoCrmDomainName,
      tokens,
    });

    if (body.publicBotStepSettings.type == BotStepType.SendDataToAmoCrm) {
      return await this.sendVarsToAmoCrm(body, tokens, lead);
    }
    if (body.publicBotStepSettings.type == BotStepType.SendDataToSenler) {
      return await this.sendVarsToSenler(body, amoCrmLead);
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

  async sendVarsToSenler(body: BotStepWebhookDto, amoCrmLead: AmoCrmLead) {
    const amoCrmLeadCustomFieldsValues = amoCrmLead.custom_fields_values;

    this.logger.debug('amoCrmLeadCustomFieldsValues', amoCrmLeadCustomFieldsValues);

    const VarsValues = this.utils.convertAmoFieldsToSenlerVars(
      body.publicBotStepSettings.syncableVariables,
      amoCrmLeadCustomFieldsValues
    );

    return VarsValues;
  }

  async getOrCreateLeadIfNotExists({
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
  }): Promise<{
    lead: Lead & { senlerGroup: SenlerGroup };
    amoCrmLead: AmoCrmLead;
  }> {
    let lead = await prisma.lead.findUnique({ where: { senlerLeadId }, include: { senlerGroup: true } });

    if (lead) {
      const actualAmoCrmLead = await this.amoCrmService.createLeadIfNotExists({
        amoCrmDomainName,
        amoCrmLeadId: lead.amoCrmLeadId,
        name,
        tokens,
      });

      if (lead.amoCrmLeadId != actualAmoCrmLead.id) {
        lead = await prisma.lead.update({
          where: { amoCrmLeadId: lead.amoCrmLeadId, senlerLeadId },
          include: { senlerGroup: true },
          data: { amoCrmLeadId: actualAmoCrmLead.id },
        });
      }
      return { lead, amoCrmLead: actualAmoCrmLead };
    }

    const newAmoCrmLead = await this.amoCrmService.addLead({
      amoCrmDomainName,
      leads: [{ name }],
      tokens,
    });

    const newLead = await prisma.lead.create({
      include: { senlerGroup: true },
      data: {
        amoCrmLeadId: newAmoCrmLead.id,
        senlerLeadId: senlerLeadId,
        senlerGroup: {
          connect: {
            senlerGroupId,
          },
        },
      },
    });

    return {
      lead: newLead,
      amoCrmLead: newAmoCrmLead,
    };
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
