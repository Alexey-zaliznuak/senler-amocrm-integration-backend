import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Prisma, SenlerGroup } from '@prisma/client';
import { AxiosError, HttpStatusCode } from 'axios';
import { AmoCrmService } from 'src/external/amo-crm';
import { PRISMA } from 'src/infrastructure/database/database.config';
import { PrismaExtendedClientType } from 'src/infrastructure/database/database.service';
import { CreateSenlerGroupRequestDto, CreateSenlerGroupResponseDto } from './dto/create-senler-group.dto';
import { GetSenlerGroupResponse, SenlerGroupFieldForGetByUniqueField } from './dto/get-senler-group.dto';

@Injectable()
export class SenlerGroupsService {
  constructor(
    private readonly amoCrmService: AmoCrmService,
    @Inject(PRISMA) private readonly prisma: PrismaExtendedClientType
  ) {}

  async create(data: CreateSenlerGroupRequestDto): Promise<CreateSenlerGroupResponseDto> {
    await this.validateCreateSenlerGroupData(data);

    try {
      const amoTokens = await this.amoCrmService.getAccessAndRefreshTokens(data.amoCrmDomainName, data.amoCrmAuthorizationCode);

      return await this.prisma.senlerGroup.create({
        select: {
          id: true,
          senlerGroupId: true,
        },
        data: {
          amoCrmDomainName: data.amoCrmDomainName,
          senlerAccessToken: data.senlerAccessToken,
          senlerGroupId: data.senlerGroupId,
          senlerGroupVkId: data.senlerGroupVkId,
          amoCrmAccessToken: amoTokens.access_token,
          amoCrmRefreshToken: amoTokens.refresh_token,
          senlerSign: data.senlerSign,
        },
      });
    } catch (exception) {
      if (exception instanceof AxiosError && exception.status === HttpStatusCode.BadRequest) {
        throw new ServiceUnavailableException();
      }

      if (exception instanceof AxiosError && exception.code === 'ENOTFOUND') {
        throw new BadRequestException('Invalid AmoCrm domain name');
      }

      throw exception;
    }
  }

  async getByUniqueField(
    identifier: string | number,
    field: SenlerGroupFieldForGetByUniqueField
  ): Promise<GetSenlerGroupResponse | never> {
    identifier = identifier as Prisma.SenlerGroupWhereUniqueInput[typeof field];
    const SenlerGroup = await this.prisma.senlerGroup.findUniqueWithCache({
      where: { [field]: identifier } as any,
    });

    if (!SenlerGroup) {
      throw new NotFoundException('SenlerGroup not found');
    }

    return SenlerGroup;
  }

  async validateCreateSenlerGroupData(data: CreateSenlerGroupRequestDto) {
    await this.checkConstraintsOrThrow(data);
  }

  async checkConstraintsOrThrow(
    constraints: Partial<
      Pick<
        SenlerGroup,
        | 'id'
        | 'amoCrmAccessToken'
        | 'amoCrmDomainName'
        | 'amoCrmRefreshToken'
        | 'senlerAccessToken'
        | 'senlerGroupId'
        | 'senlerGroupVkId'
        | 'senlerSign'
      >
    >
  ): Promise<void | never> {
    const constraints_names = [
      'id',
      'amoCrmAccessToken',
      'amoCrmDomainName',
      'amoCrmRefreshToken',
      'senlerAccessToken',
      'senlerGroupId',
      'senlerSign',
    ];

    if (await this.prisma.senlerGroup.existsWithCache({ OR: constraints_names.map(key => ({ [key]: constraints[key] })) })) {
      throw new ConflictException('SenlerGroup with same properties already exists.');
    }
  }
}
