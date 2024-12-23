import { BadRequestException, ConflictException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { AxiosError, HttpStatusCode } from 'axios';
import { AmoCrmService } from 'src/external/amo-crm';
import { prisma } from 'src/infrastructure/database';
import { CreateSenlerGroupRequestDto, CreateSenlerGroupResponseDto } from './dto/create-senler-group.dto';

@Injectable()
export class SenlerGroupsService {
  constructor (
    private readonly amoCrmService: AmoCrmService,
  ) {}

  async create(data: CreateSenlerGroupRequestDto): Promise<CreateSenlerGroupResponseDto> {
    await this.validateCreateSenlerGroupData(data);

    try {
      const amoTokens = await this.amoCrmService.getAccessAndRefreshTokens(data.amoCrmDomainName, data.amoCrmAuthorizationCode);

      return await prisma.senlerGroup.create({
        select: {
          id: true,
          senlerVkGroupId: true,
        },
        data: {
          amoCrmDomainName: data.amoCrmDomainName,
          senlerAccessToken: data.senlerAccessToken,
          senlerVkGroupId: data.senlerVkGroupId,
          amoCrmAccessToken: amoTokens.access_token,
          amoCrmRefreshToken: amoTokens.refresh_token,
      }})
    }
    catch (exception) {
      if (
        exception instanceof AxiosError &&
        exception.status === HttpStatusCode.BadRequest
      ) throw new ServiceUnavailableException()

      if (
        exception instanceof AxiosError &&
        exception.code === 'ENOTFOUND'
      ) {
        throw new BadRequestException("Invalid AmoCrm domain name")
      }

      throw exception
    }
  }

  async validateCreateSenlerGroupData(data: CreateSenlerGroupRequestDto) {
    await this.checkConstraintsOrThrow(data.senlerVkGroupId);
  }

  async checkConstraintsOrThrow(senlerVkGroupId: string): Promise<void> {
    if (await prisma.senlerGroup.exists({senlerVkGroupId})) {
      throw new ConflictException("SenlerGroup with same Vk id already exists.");
    }
  }
}
