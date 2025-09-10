import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-custom';
import { Request } from 'express';
import { PrismaService } from '../../core/database/prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class ApiKeyStrategy extends PassportStrategy(Strategy, 'api-key') {
  constructor(private prisma: PrismaService) {
    super();
  }

  async validate(req: Request): Promise<any> {
    const apiKey = this.extractApiKey(req);
    
    if (!apiKey) {
      throw new UnauthorizedException('API key not provided');
    }

    // Extract the key prefix (first 8 characters) to find the key record
    const keyPrefix = apiKey.substring(0, 8);
    
    const keyRecord = await this.prisma.apiKey.findFirst({
      where: {
        key_prefix: keyPrefix,
        status: 'active',
      },
    });

    if (!keyRecord) {
      throw new UnauthorizedException('Invalid API key');
    }

    // Compare the provided key with the stored hash
    const isValidKey = await bcrypt.compare(apiKey, keyRecord.key_hash);
    
    if (!isValidKey) {
      throw new UnauthorizedException('Invalid API key');
    }

    if (keyRecord.expires_at && keyRecord.expires_at < new Date()) {
      await this.prisma.apiKey.update({
        where: { id: keyRecord.id },
        data: { status: 'expired' },
      });
      throw new UnauthorizedException('API key expired');
    }

    await this.prisma.apiKey.update({
      where: { id: keyRecord.id },
      data: { last_used_at: new Date() },
    });

    // Get user info
    const user = await this.prisma.user.findUnique({
      where: { id: keyRecord.user_id },
    });

    return {
      userId: keyRecord.user_id,
      email: user?.email || '',
      role: user?.role || 'api_user',
      apiKeyId: keyRecord.id,
      permissions: keyRecord.permissions,
    };
  }

  private extractApiKey(req: Request): string | null {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }
    
    return req.headers['x-api-key'] as string || null;
  }
}