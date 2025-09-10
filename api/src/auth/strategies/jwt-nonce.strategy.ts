import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { NonceService } from '../../common/services/nonce.service';

@Injectable()
export class JwtNonceStrategy extends PassportStrategy(Strategy, 'jwt-nonce') {
  constructor(
    private config: ConfigService,
    private nonceService: NonceService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: config.get('JWT_SECRET'),
      passReqToCallback: true, // Pass the request to the validate method
    });
  }

  async validate(request: any, payload: any) {
    // Validate JWT nonce (jti)
    if (!payload.jti) {
      throw new UnauthorizedException('Invalid token: missing JWT ID');
    }

    const nonceValidation = await this.nonceService.validateJwtNonce(
      payload.jti,
      payload.sub,
    );

    if (!nonceValidation.valid) {
      throw new UnauthorizedException(`Invalid token: ${nonceValidation.reason}`);
    }

    // Check token age for additional security
    const tokenAge = Date.now() / 1000 - payload.iat;
    const maxAge = this.config.get('JWT_MAX_AGE') || 900; // 15 minutes default

    if (tokenAge > maxAge) {
      throw new UnauthorizedException('Token too old');
    }

    // Return user payload for request.user
    return {
      userId: payload.sub,
      email: payload.email,
      role: payload.role,
      jti: payload.jti,
    };
  }
}