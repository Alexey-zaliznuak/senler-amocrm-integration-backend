import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { IntegrationStepTemplate } from '@prisma/client';
import { PRISMA } from 'src/infrastructure/database/database.config';
import { PrismaExtendedClientType } from 'src/infrastructure/database/database.service';
import {
  CreateIntegrationStepTemplateRequestDto,
  CreateIntegrationStepTemplateResponseDto,
} from './dto/create-integration-step-template.dto';
import { GetSenlerGroupResponseDto } from './dto/get-integration-step-template.dto';
import {
  UpdateIntegrationStepTemplateRequestDto,
  UpdateIntegrationStepTemplateResponseDto,
} from './dto/update-integration-step-template.dto';

@Injectable()
export class IntegrationStepTemplatesService {
  constructor(@Inject(PRISMA) private readonly prisma: PrismaExtendedClientType) {}

  async create(data: CreateIntegrationStepTemplateRequestDto): Promise<CreateIntegrationStepTemplateResponseDto> {
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
    await this.prisma.senlerGroup.invalidateCache(senlerGroupId);
    return template;
  }

  async update(
    data: UpdateIntegrationStepTemplateRequestDto,
    templateId: string
  ): Promise<UpdateIntegrationStepTemplateResponseDto> {
    const template = await this.prisma.integrationStepTemplate.findUniqueWithCache({ where: { id: templateId } });

    await this.prisma.integrationStepTemplate.update({
      where: { id: templateId },
      data: Object.assign(template, data),
    });

    await this.prisma.senlerGroup.invalidateCache(template.senlerGroupId);
    await this.prisma.integrationStepTemplate.invalidateCache(templateId);

    return template;
  }

  async getById(id: string): Promise<GetSenlerGroupResponseDto> {
    const integrationStepTemplate = await this.prisma.integrationStepTemplate.findFirstOrThrowWithCache({
      where: { id },
      select: { id: true, name: true, settings: true, senlerGroupId: true },
    });

    return integrationStepTemplate;
  }

  async deleteById(id: string) {
    const integrationStepTemplate = await this.prisma.integrationStepTemplate.deleteWithCacheInvalidate({
      where: { id },
      select: { senlerGroupId: true },
    });
    await this.prisma.senlerGroup.invalidateCache(integrationStepTemplate.senlerGroupId);
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
