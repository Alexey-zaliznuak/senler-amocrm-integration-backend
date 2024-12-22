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
    let lead = +(
      await prisma.lead.findUnique({
        where: {
          amoCrmLeadId: '' + leadId,
          senlerGroupId: groupId,
        },
      })
    ).id;

    if (!lead) {
      lead = (
        await this.amoCrmService.addLead({
          amoCrmDomain,
          leads: [{ name }],
        })
      ).id;
    } else {
      lead = await this.amoCrmService.createLeadIfNotExists({
        amoCrmDomain,
        leadId,
        name,
      });
    }

    if (lead != leadId) {
      // обновить
    }
  }
}
