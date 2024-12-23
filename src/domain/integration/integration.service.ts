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
    const databaseLead = +(
      await prisma.lead.findUnique({
        where: {
          amoCrmLeadId,
          senlerLeadId
        },
      })
    ).id;

    const actualLead = databaseLead ?
    await this.amoCrmService.addLead({amoCrmDomain,leads: [{ name }],})
    : await this.amoCrmService.createLeadIfNotExists({amoCrmDomain, amoCrmLeadId, name,});

    if (amoCrmLeadId != actualLead) {
      // обновить
    }
  }
}
