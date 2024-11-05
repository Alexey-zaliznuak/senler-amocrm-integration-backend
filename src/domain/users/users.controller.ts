import { Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Post } from '@nestjs/common';
import { UsersService } from './users.service';
import { GetUserResponse } from './dto/get-user.dto';
import { ApiResponse } from '@nestjs/swagger';
import { CreateUser, CreateUserDto } from './dto/create-user.dto';


@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {
  }

  @Get(":vkGroupId")
  // TODO: Auth for vk group id by senler
  async getById(@Param('vkGroupId') vkGroupId: string): Promise<GetUserResponse> {
    return this.usersService.getByVkGroupId(vkGroupId)
  }

  // TODO: Auth for vk group id by senler
  @Post("")
  @HttpCode(HttpStatus.CREATED)
  @ApiResponse({ status: HttpStatus.CONFLICT, description: 'Conflict when creating new user.' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Success created new user.' })
  async create(@Body() data: CreateUserDto): Promise<any> {
    return this.usersService.create(data)
  }
}
