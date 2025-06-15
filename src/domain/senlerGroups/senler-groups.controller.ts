import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
  Request,
} from '@nestjs/common';
import { ApiParam, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { Request as ExpressRequest } from 'express';
import passport from 'passport';
import { SenlerStrategy } from 'passport-senler';
import { CreateSenlerGroupRequestDto, CreateSenlerGroupResponseDto } from './dto/create-senler-group.dto';
import {
  GetSenlerGroupResponseDto,
  SenlerGroupFieldForGetByUniqueField,
  SenlerGroupFieldForGetByUniqueFieldEnum,
} from './dto/get-senler-group.dto';
import { UpdateSenlerGroupAmoCrmCredentialsRequestDto } from './dto/update-senler-group.dto';
import { SenlerGroupsService } from './senler-groups.service';

// passport.use(
//   new SenlerStrategy({
//     clientID: "670b92d90d647d1fc4350042",
//     clientSecret: '6c0be2c31d56d105ce19d3e5c18311e5808cd3b2',
//     callbackURL: 'https://yourapp.com/auth/senler/callback',
//   } as any)
// );

@Controller('senlerGroups')
export class SenlerGroupsController {
  constructor(private readonly senlerGroupsService: SenlerGroupsService) {}

  @Post('')
  @HttpCode(HttpStatus.CREATED)
  @ApiResponse({
    status: HttpStatus.CREATED,
    type: CreateSenlerGroupResponseDto,
    description: 'Success created new senler group.',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Conflict when creating new senler group.',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid amoCRM domain name.',
  })
  async create(@Body() data: CreateSenlerGroupRequestDto): Promise<CreateSenlerGroupResponseDto> {
    return await this.senlerGroupsService.create(data);
  }

  // @Get('/setTokenFromAuthCallback')
  // async setTokenFromAuthCallback(
  //   @Request() req: ExpressRequest,
  //   @Query('code') code: string,
  //   @Query('group_id') groupId: number
  // ): Promise<any> {
  //   passport.authenticate('senler', {
  //     failureRedirect: '/auth/senler/error',
  //     session: false,
  //   });

  //   const token = "1234";

  //   await this.senlerGroupsService.setSenlerAccessToken(token, groupId);

  //   return "1"
  // }

  @Put(':identifier/amoCrmToken')
  @HttpCode(HttpStatus.OK)
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid amoCRM domain name.',
  })
  async updateAmoCrmCredentials(@Body() data: UpdateSenlerGroupAmoCrmCredentialsRequestDto): Promise<any> {
    return 'STAGED';
  }

  @Get(':identifier/')
  @ApiQuery({ name: 'field', enum: SenlerGroupFieldForGetByUniqueFieldEnum })
  @ApiParam({ name: 'identifier' })
  @ApiResponse({ type: GetSenlerGroupResponseDto })
  async getByUniqueField(
    @Param('identifier') identifier: string | number,
    @Query('field') field: SenlerGroupFieldForGetByUniqueField
  ): Promise<GetSenlerGroupResponseDto> {
    if (!identifier || !field) {
      throw new BadRequestException('No identifier or field provided');
    }
    return await this.senlerGroupsService.getByUniqueField(identifier, field);
  }

  @Delete(':identifier/')
  @ApiQuery({ name: 'field', enum: SenlerGroupFieldForGetByUniqueFieldEnum })
  @ApiParam({ name: 'identifier' })
  @ApiResponse({ type: GetSenlerGroupResponseDto })
  async deleteByUniqueField(
    @Param('identifier') identifier: string | number,
    @Query('field') field: SenlerGroupFieldForGetByUniqueField
  ): Promise<GetSenlerGroupResponseDto> {
    if (!identifier || !field) {
      throw new BadRequestException('No identifier or field provided');
    }
    return await this.senlerGroupsService.deleteByUniqueField(identifier, field);
  }
}
