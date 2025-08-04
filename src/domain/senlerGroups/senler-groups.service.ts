import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { SenlerGroup } from '@prisma/client';
import { AxiosError, HttpStatusCode } from 'axios';
import { AmoCrmService } from 'src/external/amo-crm';
import { SenlerService } from 'src/external/senler/senler.service';
import { PRISMA } from 'src/infrastructure/database/database.config';
import { PrismaExtendedClientType } from 'src/infrastructure/database/database.service';
import { CreateSenlerGroupRequestDto, CreateSenlerGroupResponseDto } from './dto/create-senler-group.dto';
import {
  GetSenlerGroupResponseDto,
  SenlerGroupFieldForGetByUniqueField,
  SenlerGroupNumericFieldsForGetByUniqueFields,
} from './dto/get-senler-group.dto';

@Injectable()
export class SenlerGroupsService {
  constructor(
    private readonly amoCrmService: AmoCrmService,
    private readonly senlerService: SenlerService,
    @Inject(PRISMA) private readonly prisma: PrismaExtendedClientType
  ) {}

  // TODO: update method, with invalidate cache for group

  async getByUniqueField(
    identifier: string | number,
    field: SenlerGroupFieldForGetByUniqueField
  ): Promise<GetSenlerGroupResponseDto> {
    identifier = SenlerGroupNumericFieldsForGetByUniqueFields.includes(field) ? +identifier : identifier;
    if (!identifier) throw new UnprocessableEntityException('Invalid identifier');

    return await this.prisma.senlerGroup.findFirstOrThrowWithCache({
      where: { [field]: identifier } as any,
      select: { id: true, senlerGroupId: true, integrationStepTemplates: true, amoCrmProfile: true },
    });
  }

  async create(data: CreateSenlerGroupRequestDto): Promise<CreateSenlerGroupResponseDto> {
    await this.validateCreateSenlerGroupData(data);

    try {
      const amoCrmProfile = await this.getOrCreateAmoCrmProfile(data);
      const senlerApiAccessToken = await this.senlerService.getAccessToken(data.senlerAuthorizationCode, data.senlerGroupId);

      if (!senlerApiAccessToken) {
        throw new ServiceUnavailableException("Senler token was not received")
      }

      return await this.prisma.senlerGroup.create({
        select: {
          id: true,
          senlerGroupId: true,
        },
        data: {
          senlerGroupId: data.senlerGroupId,
          senlerApiAccessToken: senlerApiAccessToken,
          amoCrmProfile: { connect: { id: amoCrmProfile.id } },
        },
      });
    } catch (error) {
      if (error instanceof ServiceUnavailableException) {
        throw error;
      }

      if (error instanceof AxiosError && error.status === HttpStatusCode.BadRequest) {
        throw new ServiceUnavailableException();
      }

      if (error instanceof AxiosError && error.code === 'ENOTFOUND') {
        throw new BadRequestException('Invalid amoCRM domain name');
      }

      throw error;
    }
  }

  async getOrCreateAmoCrmProfile(data: CreateSenlerGroupRequestDto) {
    let profile = await this.prisma.amoCrmProfile.findUniqueWithCache({ where: { domainName: data.amoCrmDomainName } });
    if (profile) return profile;

    const tokens = await this.amoCrmService.getAccessAndRefreshTokens({
      amoCrmDomainName: data.amoCrmDomainName,
      code: data.amoCrmAuthorizationCode,
    });

    return await this.prisma.amoCrmProfile.create({
      data: {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        domainName: data.amoCrmDomainName,
      },
    });
  }

  async deleteByUniqueField(
    identifier: string | number,
    field: SenlerGroupFieldForGetByUniqueField
  ): Promise<GetSenlerGroupResponseDto> {
    identifier = SenlerGroupNumericFieldsForGetByUniqueFields.includes(field) ? +identifier : identifier;

    await this.prisma.senlerGroup.findUniqueOrThrow({ [field]: identifier } as any);

    return await this.prisma.senlerGroup.deleteWithCacheInvalidate({
      where: { [field]: identifier } as any,
    });
  }

  async validateCreateSenlerGroupData(data: CreateSenlerGroupRequestDto) {
    await this.checkConstraintsOrThrow(data);
  }

  async checkConstraintsOrThrow(
    constraints: Partial<Pick<SenlerGroup, 'id' | 'senlerGroupId' | 'senlerApiAccessToken'>>
  ): Promise<void | never> {
    const constraintsNames = ['id', 'senlerGroupId', 'senlerApiAccessToken'];
    const validConstraints = constraintsNames
      .filter(key => constraints[key] !== undefined && constraints[key] !== null)
      .map(key => ({ [key]: constraints[key] }));

    if (validConstraints.length === 0) {
      return;
    }

    if (await this.prisma.senlerGroup.existsWithCache({ OR: validConstraints })) {
      throw new ConflictException('SenlerGroup с такими свойствами уже существует');
    }
  }
}
