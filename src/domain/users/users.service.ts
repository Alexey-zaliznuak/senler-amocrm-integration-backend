import { BadRequestException, ConflictException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { prisma } from 'src/infrastructure/database';
import { CreateUserDto, CreateUserRequestDto, CreateUserResponseDto } from './dto/create-user.dto';
import { AmoCrmService } from 'src/external/amo-crm';
import { AxiosError, HttpStatusCode } from 'axios';

@Injectable()
export class UsersService {
  constructor (
    private readonly amoCrmService: AmoCrmService,
  ) {}

  async create(data: CreateUserRequestDto): Promise<CreateUserResponseDto> {
    await this.validateCreateUserData(data);

    try {
      const amoTokens = await this.amoCrmService.getAccessAndRefreshTokens(data.amoCrmDomainName, data.amoCrmAuthorizationCode);

      return await prisma.user.create({
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

  async validateCreateUserData(data: CreateUserRequestDto) {
    await this.checkConstraintsOrThrow(data.senlerVkGroupId);
  }

  async checkConstraintsOrThrow(senlerVkGroupId: string): Promise<void> {
    if (await prisma.user.exists({senlerVkGroupId})) {
      throw new ConflictException("User with same VkGroupId already exists.");
    }
  }
}
