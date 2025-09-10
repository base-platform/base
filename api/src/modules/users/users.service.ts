import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma/prisma.service';
import * as bcrypt from 'bcrypt';

export interface CreateUserDto {
  email: string;
  password?: string;
  first_name?: string;
  last_name?: string;
  username?: string;
  role?: 'admin' | 'user' | 'api_user';
  is_active?: boolean;
}

export interface UpdateUserDto {
  first_name?: string;
  last_name?: string;
  username?: string;
  role?: 'admin' | 'user' | 'api_user';
  is_active?: boolean;
  password?: string;
}

export interface UserFilters {
  role?: 'admin' | 'user' | 'api_user';
  is_active?: boolean;
  search?: string;
}

export interface PaginationOptions {
  page?: number;
  limit?: number;
}

export interface User {
  id: string;
  email: string;
  username?: string;
  first_name?: string;
  last_name?: string;
  role: string;
  is_active?: boolean;
  email_verified?: boolean;
  last_login_at?: Date;
  created_at: Date;
  updated_at: Date;
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(filters: UserFilters = {}, pagination: PaginationOptions = {}) {
    const { page = 1, limit = 10 } = pagination;
    const skip = (page - 1) * limit;

    const where: any = {};
    
    if (filters.role) {
      where.role = filters.role;
    }
    
    if (filters.is_active !== undefined) {
      where.is_active = filters.is_active;
    }
    
    if (filters.search) {
      where.OR = [
        { email: { contains: filters.search, mode: 'insensitive' } },
        { username: { contains: filters.search, mode: 'insensitive' } },
        { first_name: { contains: filters.search, mode: 'insensitive' } },
        { last_name: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        select: {
          id: true,
          email: true,
          username: true,
          first_name: true,
          last_name: true,
          role: true,
          is_active: true,
          email_verified: true,
          last_login_at: true,
          created_at: true,
          updated_at: true,
        },
        orderBy: { created_at: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data: users,
      meta: {
        total,
        page,
        pageSize: limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findById(id: string): Promise<User> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        username: true,
        first_name: true,
        last_name: true,
        role: true,
        is_active: true,
        email_verified: true,
        last_login_at: true,
        created_at: true,
        updated_at: true,
      },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return user as User;
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  async create(createUserDto: CreateUserDto): Promise<User> {
    const { email, password, ...userData } = createUserDto;

    // Check if user already exists
    const existingUser = await this.findByEmail(email);
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Hash password if provided
    let hashedPassword: string | undefined;
    if (password) {
      hashedPassword = await bcrypt.hash(password, 10);
    }

    const user = await this.prisma.user.create({
      data: {
        email,
        password_hash: hashedPassword,
        username: userData.username,
        first_name: userData.first_name,
        last_name: userData.last_name,
        role: userData.role || 'user',
        is_active: userData.is_active !== false,
      },
      select: {
        id: true,
        email: true,
        username: true,
        first_name: true,
        last_name: true,
        role: true,
        is_active: true,
        email_verified: true,
        created_at: true,
        updated_at: true,
      },
    });

    return user as User;
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    // Check if user exists
    await this.findById(id);

    const { password, ...userData } = updateUserDto;

    // Hash password if provided
    let updateData: any = { ...userData };
    if (password) {
      updateData.password_hash = await bcrypt.hash(password, 10);
    }

    const user = await this.prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        username: true,
        first_name: true,
        last_name: true,
        role: true,
        is_active: true,
        email_verified: true,
        last_login_at: true,
        created_at: true,
        updated_at: true,
      },
    });

    return user as User;
  }

  async delete(id: string): Promise<void> {
    // Check if user exists
    await this.findById(id);

    await this.prisma.user.delete({
      where: { id },
    });
  }

  async activate(id: string): Promise<void> {
    await this.findById(id);
    
    await this.prisma.user.update({
      where: { id },
      data: { is_active: true },
    });
  }

  async deactivate(id: string): Promise<void> {
    await this.findById(id);
    
    await this.prisma.user.update({
      where: { id },
      data: { is_active: false },
    });
  }

  async getUserStats() {
    const [totalUsers, activeUsers, adminUsers, recentUsers] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { is_active: true } }),
      this.prisma.user.count({ where: { role: 'admin' } }),
      this.prisma.user.count({
        where: {
          created_at: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
          },
        },
      }),
    ]);

    return {
      total: totalUsers,
      active: activeUsers,
      admins: adminUsers,
      recentSignups: recentUsers,
      inactive: totalUsers - activeUsers,
    };
  }
}