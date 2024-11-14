import { Body, Controller,HttpCode, HttpStatus, Post } from '@nestjs/common';
import { UsersService } from './users.service';
import { ApiResponse } from '@nestjs/swagger';
import {CreateUserRequestDto } from './dto/create-user.dto';


@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
  ) {}

  @Post("")
  @HttpCode(HttpStatus.CREATED)
  @ApiResponse({ status: HttpStatus.CONFLICT, description: 'Conflict when creating new user.' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Success created new user.' })
  async create(@Body() data: CreateUserRequestDto): Promise<any> {
    return await this.usersService.create(data)
  }
}
