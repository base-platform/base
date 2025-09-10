import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { NonceService } from '../services/nonce.service';
import { REQUIRES_NONCE_KEY } from '../decorators/requires-nonce.decorator';

@Injectable()
export class NonceGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private nonceService: NonceService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if nonce is required via decorator
    const nonceConfig = this.reflector.get<{ required?: boolean; ttl?: number; requireSignature?: boolean }>(
      REQUIRES_NONCE_KEY,
      context.getHandler(),
    );

    // If decorator is not present, check if endpoint/entity requires nonce
    const request = context.switchToHttp().getRequest();
    const { method, url, params } = request;

    // Check if nonce is required for this endpoint
    const entityId = params?.entityId || params?.id;
    
    // Check decorator first, then check entity/endpoint configuration
    let isRequired = nonceConfig?.required;
    
    if (isRequired === undefined && entityId) {
      // Check if entity has nonce enabled
      isRequired = await this.nonceService.isNonceRequired(url, method, entityId);
    }

    if (!isRequired) {
      return true; // No nonce required, allow request
    }

    // Extract nonce headers
    const nonce = request.headers['x-nonce'] || request.headers['nonce'];
    const timestamp = request.headers['x-timestamp'];
    const signature = request.headers['x-signature'];

    if (!nonce) {
      throw new BadRequestException('Missing nonce header');
    }

    if (!timestamp) {
      throw new BadRequestException('Missing timestamp header');
    }

    // Validate timestamp is within acceptable window
    const now = Date.now();
    const requestTime = parseInt(timestamp);
    const maxAge = nonceConfig?.ttl || 300000; // 5 minutes default

    if (isNaN(requestTime)) {
      throw new BadRequestException('Invalid timestamp format');
    }

    if (Math.abs(now - requestTime) > maxAge) {
      throw new UnauthorizedException('Request expired');
    }

    // Get configuration for signature requirement
    const config = await this.nonceService.getNonceConfig(entityId, url);
    const requireSignature = nonceConfig?.requireSignature || 
      config?.require_signature || false;

    // Verify signature if required
    if (requireSignature) {
      if (!signature) {
        throw new BadRequestException('Missing signature header');
      }

      const isValidSignature = this.nonceService.verifySignature(
        signature,
        method,
        url,
        nonce,
        requestTime,
        request.body,
      );

      if (!isValidSignature) {
        throw new UnauthorizedException('Invalid signature');
      }
    }

    // Validate and consume the nonce
    const userId = request.user?.userId || request.user?.id;
    const validation = await this.nonceService.validateRequestNonce(
      nonce,
      url,
      method,
      userId,
    );

    if (!validation.valid) {
      throw new UnauthorizedException(`Nonce validation failed: ${validation.reason}`);
    }

    // Add nonce info to request for logging
    request.nonceInfo = {
      nonce,
      timestamp: requestTime,
      validated: true,
    };

    return true;
  }
}