import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../core/database/prisma/prisma.service';
import { NonceService } from '../../common/services/nonce.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
    private nonceService: NonceService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get('JWT_SECRET'),
    });
  }

  async validate(payload: any) {
    // Validate JWT nonce (jti) if present
    if (payload.jti) {
      const nonceValidation = await this.nonceService.validateJwtNonce(
        payload.jti,
        payload.sub,
      );

      if (!nonceValidation.valid) {
        throw new UnauthorizedException(`Invalid token: ${nonceValidation.reason}`);
      }
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user || !user.is_active) {
      throw new UnauthorizedException();
    }

    return {
      userId: user.id,
      email: user.email,
      role: user.role,
      jti: payload.jti, // Include JWT ID for token tracking
    };
  }
}