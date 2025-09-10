import { SetMetadata } from '@nestjs/common';

export const REQUIRES_NONCE_KEY = 'requires-nonce';

export interface NonceOptions {
  requireSignature?: boolean;
  ttl?: number;
}

/**
 * Decorator to mark an endpoint as requiring a nonce for replay protection
 * @param options Optional configuration for nonce validation
 */
export const RequiresNonce = (options: NonceOptions = {}) =>
  SetMetadata(REQUIRES_NONCE_KEY, { required: true, ...options });