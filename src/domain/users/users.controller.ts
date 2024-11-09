import { Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Post } from '@nestjs/common';
import { UsersService } from './users.service';
import { GetUserResponse } from './dto/get-user.dto';
import { ApiResponse } from '@nestjs/swagger';
import { CreateUserDto } from './dto/create-user.dto';
import { AmoCrmService } from 'src/external/amo-crm';


@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly amoCrmService: AmoCrmService,
  ) {}

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
    // this.usersService.create(data)
    return this.usersService.create(data)
  }

  @Post("/test")
  // @HttpCode(HttpStatus.CREATED)
  // @ApiResponse({ status: HttpStatus.CONFLICT, description: 'Conflict when creating new user.' })
  // @ApiResponse({ status: HttpStatus.CREATED, description: 'Success created new user.' })
  async test(@Body() data: CreateUserDto): Promise<any> {
    // this.usersService.create(data)
    return await this.amoCrmService.getAccessAndRefreshTokens(data.amoAuthToken)
  }
}
