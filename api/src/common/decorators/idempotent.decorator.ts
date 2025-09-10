import { SetMetadata } from '@nestjs/common';

export interface IdempotentOptions {
  ttl?: number; // Time to live in milliseconds
  methods?: string[]; // HTTP methods to apply idempotency to
  requireKey?: boolean; // Make idempotency key required
}

export const IDEMPOTENT_KEY = 'idempotent';
export const Idempotent = (options: IdempotentOptions = {}) => 
  SetMetadata(IDEMPOTENT_KEY, options);