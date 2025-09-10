import { Injectable } from '@nestjs/common';
const createDOMPurify = require('dompurify');
import { JSDOM } from 'jsdom';

@Injectable()
export class SanitizationService {
  private purify: any;

  constructor() {
    const window = new JSDOM('').window;
    this.purify = createDOMPurify(window as any);
    
    // Configure DOMPurify
    this.purify.setConfig({
      ALLOWED_TAGS: [], // No HTML tags allowed by default
      ALLOWED_ATTR: [],
      KEEP_CONTENT: true, // Keep text content
      ALLOW_DATA_ATTR: false,
      RETURN_DOM: false,
      RETURN_DOM_FRAGMENT: false,
      RETURN_DOM_IMPORT: false,
      SAFE_FOR_TEMPLATES: true,
      WHOLE_DOCUMENT: false,
      FORCE_BODY: false,
    });
  }

  /**
   * Sanitize a string value, removing all HTML and script content
   */
  sanitizeString(value: string): string {
    if (typeof value !== 'string') {
      return value;
    }
    
    // Remove all HTML tags and potential XSS vectors
    const sanitized = this.purify.sanitize(value, { 
      ALLOWED_TAGS: [],
      ALLOWED_ATTR: [],
      KEEP_CONTENT: true,
    });
    
    // Additional sanitization for common XSS patterns
    return sanitized
      .replace(/javascript:/gi, '')
      .replace(/on\w+=/gi, '')
      .replace(/<script.*?<\/script>/gis, '')
      .replace(/<!--.*?-->/gs, '')
      .trim();
  }

  /**
   * Sanitize HTML content (for rich text fields)
   */
  sanitizeHtml(html: string, allowedTags?: string[]): string {
    if (typeof html !== 'string') {
      return html;
    }

    const config = allowedTags ? {
      ALLOWED_TAGS: allowedTags,
      ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class'],
      ALLOW_DATA_ATTR: false,
    } : {
      ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'a', 'ul', 'ol', 'li'],
      ALLOWED_ATTR: ['href'],
      ALLOW_DATA_ATTR: false,
    };

    return this.purify.sanitize(html, config);
  }

  /**
   * Recursively sanitize an object
   */
  sanitizeObject(obj: any): any {
    if (obj === null || obj === undefined) {
      return obj;
    }

    if (typeof obj === 'string') {
      return this.sanitizeString(obj);
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.sanitizeObject(item));
    }

    if (typeof obj === 'object' && obj.constructor === Object) {
      const sanitized: any = {};
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          // Sanitize the key as well to prevent prototype pollution
          const sanitizedKey = this.sanitizeString(key);
          sanitized[sanitizedKey] = this.sanitizeObject(obj[key]);
        }
      }
      return sanitized;
    }

    return obj;
  }

  /**
   * Validate and sanitize email
   */
  sanitizeEmail(email: string): string {
    if (typeof email !== 'string') {
      return '';
    }
    
    // Remove any HTML/script content first
    const sanitized = this.sanitizeString(email);
    
    // Basic email validation and cleaning
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    const cleanEmail = sanitized.toLowerCase().trim();
    
    return emailRegex.test(cleanEmail) ? cleanEmail : '';
  }

  /**
   * Sanitize filename to prevent directory traversal
   */
  sanitizeFilename(filename: string): string {
    if (typeof filename !== 'string') {
      return '';
    }
    
    return filename
      .replace(/[^a-zA-Z0-9._-]/g, '') // Remove special characters
      .replace(/\.\./g, '') // Remove directory traversal
      .replace(/^\./, '') // Remove leading dots
      .substring(0, 255); // Limit length
  }

  /**
   * Sanitize SQL-like input (for search queries)
   */
  sanitizeSqlInput(input: string): string {
    if (typeof input !== 'string') {
      return '';
    }
    
    return input
      .replace(/['";\\]/g, '') // Remove SQL special characters
      .replace(/--/g, '') // Remove SQL comments
      .replace(/\/\*/g, '') // Remove block comments
      .replace(/\*\//g, '')
      .replace(/xp_/gi, '') // Remove extended stored procedures
      .replace(/sp_/gi, '') // Remove stored procedures
      .trim();
  }

  /**
   * Detect potential XSS attempts
   */
  detectXss(input: string): boolean {
    if (typeof input !== 'string') {
      return false;
    }
    
    const xssPatterns = [
      /<script.*?>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
      /eval\(/gi,
      /alert\(/gi,
      /document\./gi,
      /window\./gi,
      /<iframe/gi,
      /<embed/gi,
      /<object/gi,
      /\.innerHTML/gi,
      /\.outerHTML/gi,
    ];
    
    return xssPatterns.some(pattern => pattern.test(input));
  }
}