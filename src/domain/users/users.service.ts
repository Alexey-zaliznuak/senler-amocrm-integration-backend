import { ConflictException, Injectable } from '@nestjs/common';
import { prisma } from 'src/infrastructure/database';
import { CreateUserDto, CreateUserRequestDto, CreateUserResponseDto } from './dto/create-user.dto';
import { AmoCrmService } from 'src/external/amo-crm';

@Injectable()
export class UsersService {
  constructor (
    private readonly amoCrmService: AmoCrmService,
  ) {}

  async create(data: CreateUserRequestDto): Promise<CreateUserResponseDto> {
    await this.validateCreateUserData(data);

    const amoTokens = await this.amoCrmService.getAccessAndRefreshTokens(data.amoCrmDomain, data.amoCrmAuthorizationCode);

    return await prisma.user.create({
      select: {
        id: true,
        senlerVkGroupId: true,
      },
      data: {
        senlerAccessToken: data.senlerAccessToken,
        senlerVkGroupId: data.senlerVkGroupId,
        amoCrmAccessToken: amoTokens.access_token,
        amoCrmRefreshToken: amoTokens.refresh_token,
    }})
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
