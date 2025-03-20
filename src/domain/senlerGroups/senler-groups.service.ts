import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { SenlerGroup } from '@prisma/client';
import { AxiosError, HttpStatusCode } from 'axios';
import { AmoCrmService } from 'src/external/amo-crm';
import { PRISMA } from 'src/infrastructure/database/database.config';
import { PrismaExtendedClientType } from 'src/infrastructure/database/database.service';
import { CreateSenlerGroupRequestDto, CreateSenlerGroupResponseDto } from './dto/create-senler-group.dto';
import {
  GetSenlerGroupResponse,
  SenlerGroupFieldForGetByUniqueField,
  SenlerGroupNumericFieldsForGetByUniqueFields,
} from './dto/get-senler-group.dto';

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
  ): Promise<GetSenlerGroupResponse | never> {
    identifier = SenlerGroupNumericFieldsForGetByUniqueFields.includes(field) ? +identifier : identifier;
    if (!identifier) throw new UnprocessableEntityException('Invalid identifier');

    const senlerGroup = await this.prisma.senlerGroup.findUniqueWithCache({
      where: { [field]: identifier } as any,
    });

    if (!senlerGroup) throw new NotFoundException('SenlerGroup not found');

    return senlerGroup;
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
      >
    >
  ): Promise<void | never> {
    const constraintsNames = [
      'id',
      'amoCrmAccessToken',
      'amoCrmDomainName',
      'amoCrmRefreshToken',
      'senlerAccessToken',
      'senlerGroupId',
    ];

    if (await this.prisma.senlerGroup.existsWithCache({ OR: constraintsNames.map(key => ({ [key]: constraints[key] })) })) {
      throw new ConflictException('SenlerGroup with same properties already exists');
    }
  }
}
