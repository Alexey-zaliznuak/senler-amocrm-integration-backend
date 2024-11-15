import { ConflictException, Injectable } from '@nestjs/common';
import { prisma } from 'src/infrastructure/database';
import { CreateUserDto, CreateUserRequestDto } from './dto/create-user.dto';
import { AmoCrmService } from 'src/external/amo-crm';

@Injectable()
export class UsersService {
  constructor (
    private readonly amoCrmService: AmoCrmService,
  ) {}

  async create(data: CreateUserRequestDto): Promise<CreateUserDto> {
    await this.validateCreateUserData(data);

    const amoTokens = await this.amoCrmService.getAccessAndRefreshTokens(data.amoCrmDomain, data.amoCrmAuthorizationCode);

    return await prisma.user.create({
      select: {
        senlerAccessToken: true,
        senlerVkGroupId: true,
        amoCrmAccessToken: true,
        amoCrmRefreshToken: true,
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
