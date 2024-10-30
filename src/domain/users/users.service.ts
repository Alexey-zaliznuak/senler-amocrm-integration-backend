import { ConflictException, Injectable } from '@nestjs/common';
import { prisma } from 'src/infrastructure/database';
import { GetUserResponse } from './dto/get-user.dto';
import { CreateUserDto } from './dto/create-user.dto';

@Injectable()
export class UsersService {
  async getByVkGroupId(vkGroupId: string): Promise<GetUserResponse> {
    return await prisma.user.findUnique({
      include: {
        senlerIntegrationStepsTemplates: true,
      },
      where: {
        senlerVkGroupId: vkGroupId,
      }
    })
  }

  async create(data: CreateUserDto): Promise<GetUserResponse> {
    await this.validateNewGroupData(data);

    return await prisma.user.create({
      include: { senlerIntegrationStepsTemplates: true },
      data
    })
  }

  async validateNewGroupData(data: CreateUserDto) {
    await this.checkOrThrowSameGroupNotExists(data.senlerVkGroupId);
  }

  async checkOrThrowSameGroupNotExists(senlerVkGroupId: string): Promise<void> {
    if (await prisma.user.exists({senlerVkGroupId})) {
      throw new ConflictException("User with same VkGroupId already exists.");
    }
  }
}
