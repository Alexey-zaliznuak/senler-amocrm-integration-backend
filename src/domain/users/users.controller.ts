import { Body, Controller, Get, HttpCode, Param, Patch, Post } from '@nestjs/common';
import { UsersService } from './users.service';
import { GetUserResponse } from './dto/get-user.dto';
import { ApiResponse } from '@nestjs/swagger';
import { CreateUser } from './dto/create-user.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {
  }
  @Get("{vkGroupId}")
  // TODO: Auth for vk group id by senler
  async getById(@Param('vkGroupId') vkGroupId: string): Promise<GetUserResponse> {
    return this.usersService.getByVkGroupId(vkGroupId)
  }

  // TODO: Auth for vk group id by senler
  @Post("")
  @HttpCode(409)
  @ApiResponse({ status: 409, description: 'Conflict during creating new user.' })
  @ApiResponse({ status: 201, description: 'Success created new user.' })
  async create(@Body() data: CreateUser): Promise<GetUserResponse> {
    return this.usersService.create(data)
  }
}
