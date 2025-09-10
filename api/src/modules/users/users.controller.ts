import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UsersService, CreateUserDto, UpdateUserDto, UserFilters, User } from './users.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@Controller('admin/users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('role') role?: 'admin' | 'user' | 'api_user',
    @Query('is_active') is_active?: string,
    @Query('search') search?: string,
  ) {
    const filters: UserFilters = {
      role,
      is_active: is_active !== undefined ? is_active === 'true' : undefined,
      search,
    };

    return this.usersService.findAll(filters, { 
      page: page ? parseInt(page) : undefined, 
      limit: limit ? parseInt(limit) : undefined 
    });
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<User> {
    return this.usersService.findById(id);
  }

  @Post()
  async create(@Body() createUserDto: CreateUserDto): Promise<User> {
    return this.usersService.create(createUserDto);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<User> {
    return this.usersService.update(id, updateUserDto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string): Promise<void> {
    return this.usersService.delete(id);
  }

  @Post(':id/activate')
  async activate(@Param('id') id: string): Promise<void> {
    return this.usersService.activate(id);
  }

  @Post(':id/deactivate')
  async deactivate(@Param('id') id: string): Promise<void> {
    return this.usersService.deactivate(id);
  }

  @Get('stats/overview')
  async getStats() {
    return this.usersService.getUserStats();
  }
}