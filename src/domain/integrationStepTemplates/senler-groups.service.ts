import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { IntegrationStepTemplate } from '@prisma/client';
import { PRISMA } from 'src/infrastructure/database/database.config';
import { PrismaExtendedClientType } from 'src/infrastructure/database/database.service';
import { CreateIntegrationStepTemplateRequestDto } from './dto/create-senler-group.dto';
import { GetSenlerGroupResponseDto } from './dto/get-senler-group.dto';

@Injectable()
export class IntegrationStepTemplatesService {
  constructor(@Inject(PRISMA) private readonly prisma: PrismaExtendedClientType) {}

  async create(data: CreateIntegrationStepTemplateRequestDto): Promise<CreateIntegrationStepTemplateRequestDto> {
    const { name, settings, senlerGroupId } = data;
    await this.validateCreateIntegrationStepTemplateData(data);

    return await this.prisma.integrationStepTemplate.create({
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
  }

  async getById(id: string): Promise<GetSenlerGroupResponseDto> {
    const integrationStepTemplate = await this.prisma.integrationStepTemplate.findFirstOrThrowWithCache({
      where: { id },
      select: { id: true, name: true, settings: true, senlerGroupId: true},
    });

    return integrationStepTemplate;
  }

  async validateCreateIntegrationStepTemplateData(data: CreateIntegrationStepTemplateRequestDto) {
    await this.checkConstraintsOrThrow(data);
  }

  async checkConstraintsOrThrow(constraints: Partial<Pick<IntegrationStepTemplate, 'id' | 'name'>>): Promise<void | never> {
    const constraintsNames = ['id', 'name'];

    if (await this.prisma.senlerGroup.existsWithCache({ OR: constraintsNames.map(key => ({ [key]: constraints[key] })) })) {
      throw new ConflictException('Integration step template with same properties already exists');
    }
  }
}
