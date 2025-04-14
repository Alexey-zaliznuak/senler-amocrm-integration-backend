import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { IntegrationStepTemplate } from '@prisma/client';
import { PRISMA } from 'src/infrastructure/database/database.config';
import { PrismaExtendedClientType } from 'src/infrastructure/database/database.service';
import { CreateIntegrationStepTemplateRequestDto } from './dto/create-integration-step-template.dto';
import { GetSenlerGroupResponseDto } from './dto/get-integration-step-template.dto';

@Injectable()
export class IntegrationStepTemplatesService {
  constructor(@Inject(PRISMA) private readonly prisma: PrismaExtendedClientType) {}

  async create(data: CreateIntegrationStepTemplateRequestDto): Promise<CreateIntegrationStepTemplateRequestDto> {
    const { name, settings, senlerGroupId } = data;

    await this.validateCreateIntegrationStepTemplateData(data);

    const template = await this.prisma.integrationStepTemplate.create({
      select: {
        id: true,
        name: true,
        settings: true,
        senlerGroupId: true,
      },
      data: {
        name,
        settings,
        senlerGroupId,
      },
    });
    await this.prisma.senlerGroup.invalidateCache(senlerGroupId)
    return template
  }

  async getById(id: string): Promise<GetSenlerGroupResponseDto> {
    const integrationStepTemplate = await this.prisma.integrationStepTemplate.findFirstOrThrowWithCache({
      where: { id },
      select: { id: true, name: true, settings: true, senlerGroupId: true },
    });

    return integrationStepTemplate;
  }

  async validateCreateIntegrationStepTemplateData(data: CreateIntegrationStepTemplateRequestDto) {
    await this.checkConstraintsOrThrow(data);
    await this.prisma.senlerGroup.findUniqueOrThrowWithCache({ where: { id: data.senlerGroupId } });
  }

  async checkConstraintsOrThrow(constraints: Partial<Pick<IntegrationStepTemplate, 'id' | 'name'>>): Promise<void | never> {
    const constraintsNames = ['id', 'name'];

    if (
      await this.prisma.integrationStepTemplate.existsWithCache({
        OR: constraintsNames.map(key => ({ [key]: constraints[key] })),
      })
    ) {
      throw new ConflictException('Integration step template with same properties already exists');
    }
  }
}
