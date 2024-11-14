import { ConflictException, Injectable } from '@nestjs/common';
import { prisma } from 'src/infrastructure/database';
import { CreateUserDto, CreateUserRequestDto } from './dto/create-user.dto';
import { AmoCrmService } from 'src/external/amo-crm';

@Injectable()
export class UsersService {
  constructor (
    private readonly amoCrmService: AmoCrmService,
  ) {}

  async create(data: CreateUserRequestDto) {
    await this.validateCreateUserData(data);
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
