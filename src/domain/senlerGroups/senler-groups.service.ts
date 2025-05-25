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
import { AppConfig } from 'src/infrastructure/config/config.app-config';
import { PRISMA } from 'src/infrastructure/database/database.config';
import { PrismaExtendedClientType } from 'src/infrastructure/database/database.service';
import { LoggingService } from 'src/infrastructure/logging/logging.service';
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
    @Inject(PRISMA) private readonly prisma: PrismaExtendedClientType
  ) {}

  // TODO: update method, with invalidate cache for group

  async create(data: CreateSenlerGroupRequestDto): Promise<CreateSenlerGroupResponseDto> {
    await this.validateCreateSenlerGroupData(data);

    try {
      const amoTokens = await this.amoCrmService.getAccessAndRefreshTokens({amoCrmDomainName: data.amoCrmDomainName, code: data.amoCrmAuthorizationCode});

      return await this.prisma.senlerGroup.create({
        select: {
          id: true,
          senlerGroupId: true,
        },
        data: {
          amoCrmDomainName: data.amoCrmDomainName,
          senlerGroupId: data.senlerGroupId,
          amoCrmAccessToken: amoTokens.access_token,
          amoCrmRefreshToken: amoTokens.refresh_token,
          senlerApiAccessToken: data.senlerApiAccessToken,
        },
      });
    } catch (exception) {
      if (exception instanceof AxiosError && exception.status === HttpStatusCode.BadRequest) {
        throw new ServiceUnavailableException();
      }

      if (exception instanceof AxiosError && exception.code === 'ENOTFOUND') {
        throw new BadRequestException('Invalid amoCRM domain name');
      }

      throw exception;
    }
  }

  async getByUniqueField(
    identifier: string | number,
    field: SenlerGroupFieldForGetByUniqueField
  ): Promise<GetSenlerGroupResponseDto> {
    identifier = SenlerGroupNumericFieldsForGetByUniqueFields.includes(field) ? +identifier : identifier;
    if (!identifier) throw new UnprocessableEntityException('Invalid identifier');

    return await this.prisma.senlerGroup.findFirstOrThrowWithCache({
      where: { [field]: identifier } as any,
      select: { id: true, amoCrmDomainName: true, senlerGroupId: true, integrationStepTemplates: true },
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
    constraints: Partial<
      Pick<
        SenlerGroup,
        'id' | 'amoCrmAccessToken' | 'amoCrmDomainName' | 'amoCrmRefreshToken' | 'senlerGroupId' | 'senlerApiAccessToken'
      >
    >
  ): Promise<void | never> {
    const constraintsNames = [
      'id',
      'amoCrmAccessToken',
      'amoCrmDomainName',
      'amoCrmRefreshToken',
      'senlerGroupId',
      'senlerApiAccessToken',
    ];
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
