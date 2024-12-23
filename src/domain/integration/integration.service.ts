import { Injectable } from '@nestjs/common';
import { AmoCrmService } from 'src/external/amo-crm';
import { prisma } from 'src/infrastructure/database';

@Injectable()
export class IntegrationService {
  constructor(private readonly amoCrmService: AmoCrmService) {}

  async createLeadIfNotExists({
    leadId,
    groupId,
    name,
    amoCrmDomain,
  }: {
    leadId: number;
    groupId: string;
    name: string;
    amoCrmDomain: string;
  }) {
    const lead = await prisma.lead.findUnique({
      where: {
        amoCrmLeadId: leadId,
        senlerGroupId: groupId,
      },
    });

    let amoCrmLeadId = leadId;

    if (!lead) {
      amoCrmLeadId = (
        await this.amoCrmService.addLead({
          amoCrmDomain,
          leads: [{ name }],
        })
      ).id;
    } else {
      amoCrmLeadId = await this.amoCrmService.createLeadIfNotExists({
        amoCrmDomain,
        leadId,
        name,
      });
    }

    if (amoCrmLeadId != leadId) {
      // обновить
    }
  }
}
