import { randomBytes, createHash } from 'crypto';
import { REGEX_PATTERNS, VALIDATION_LIMITS } from '../constants';

/**
 * Generate a secure random string
 */
export function generateSecureToken(length: number = 32): string {
  return randomBytes(length).toString('hex');
}

/**
 * Hash a string using SHA-256
 */
export function hashString(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

/**
 * Generate API key with prefix
 */
export function generateApiKey(prefix: string = 'ak'): { key: string; prefix: string } {
  const randomPart = generateSecureToken(16);
  const key = `${prefix}_${randomPart}`;
  
  return {
    key,
    prefix: key.substring(0, 8),
  };
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  if (!email || email.length > VALIDATION_LIMITS.EMAIL_MAX_LENGTH) {
    return false;
  }
  return REGEX_PATTERNS.EMAIL.test(email);
}

/**
 * Validate username format
 */
export function isValidUsername(username: string): boolean {
  if (!username || username.length > VALIDATION_LIMITS.USERNAME_MAX_LENGTH) {
    return false;
  }
  return REGEX_PATTERNS.USERNAME.test(username);
}

/**
 * Validate entity name format
 */
export function isValidEntityName(name: string): boolean {
  if (!name || name.length > VALIDATION_LIMITS.NAME_MAX_LENGTH) {
    return false;
  }
  return REGEX_PATTERNS.ENTITY_NAME.test(name);
}

/**
 * Validate UUID format
 */
export function isValidUUID(uuid: string): boolean {
  return REGEX_PATTERNS.UUID.test(uuid);
}

/**
 * Convert camelCase to snake_case
 */
export function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

/**
 * Convert snake_case to camelCase
 */
export function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

/**
 * Deep clone an object
 */
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Remove undefined properties from object
 */
export function removeUndefined<T extends Record<string, any>>(obj: T): Partial<T> {
  const result: Partial<T> = {};
  
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      result[key as keyof T] = value;
    }
  }
  
  return result;
}

/**
 * Create pagination metadata
 */
export function createPaginationMeta(
  page: number,
  limit: number,
  total: number,
) {
  const totalPages = Math.ceil(total / limit);
  
  return {
    page,
    limit,
    total,
    totalPages,
    hasPreviousPage: page > 1,
    hasNextPage: page < totalPages,
  };
}

/**
 * Calculate pagination offset
 */
export function calculateOffset(page: number, limit: number): number {
  return (page - 1) * limit;
}

/**
 * Sanitize string for database storage
 */
export function sanitizeString(input: string, maxLength?: number): string {
  let sanitized = input.trim().replace(/\s+/g, ' ');
  
  if (maxLength && sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }
  
  return sanitized;
}

/**
 * Generate a slug from a string
 */
export function generateSlug(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '_')
    .replace(/^-+|-+$/g, '');
}

/**
 * Check if a value is empty (null, undefined, empty string, empty array, empty object)
 */
export function isEmpty(value: any): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim().length === 0;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value).length === 0;
  return false;
}

/**
 * Format error message for logging
 */
export function formatError(error: Error): string {
  return `${error.name}: ${error.message}\nStack: ${error.stack}`;
}

/**
 * Delay execution for specified milliseconds
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry a function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 1000,
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === maxRetries) {
        throw lastError;
      }
      
      const delay = initialDelay * Math.pow(2, attempt);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  
  throw lastError!;
}