import { Injectable } from '@nestjs/common';
import { AmoCrmService } from 'src/external/amo-crm';
import { prisma } from 'src/infrastructure/database';

@Injectable()
export class IntegrationService {
  constructor(private readonly amoCrmService: AmoCrmService) {}

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
    let lead = +(
      await prisma.lead.findUnique({
        where: {
          amoCrmLeadId: leadId,
          senlerGroupId: groupId,
        },
      })
    ).id;

    if (!lead) {
      temp = (
        await this.amoCrmService.addLead({
          amoCrmDomain,
          leads: [{ name }],
        })
      ).id;
    } else {
      temp = await this.amoCrmService.createLeadIfNotExists({
        amoCrmDomain,
        amoCrmLeadId,
        name,
      });
    }

    if (amoCrmLeadId != temp) {
      // обновить
    }
  }
}
