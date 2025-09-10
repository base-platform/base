import { UseInterceptors, applyDecorators } from '@nestjs/common';
import { FileInterceptor, FilesInterceptor, FileFieldsInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiBody } from '@nestjs/swagger';
import { FileUploadSecurityService } from './file-upload-security.service';

export interface SecureFileUploadOptions {
  maxFileSize?: number;
  maxFiles?: number;
  allowedMimeTypes?: string[];
  allowedExtensions?: string[];
  context?: 'avatar' | 'document' | 'general';
  scanForMalware?: boolean;
  validateContent?: boolean;
}

/**
 * Secure single file upload decorator
 */
export function SecureFileUpload(
  fieldName: string,
  options?: SecureFileUploadOptions,
) {
  return applyDecorators(
    UseInterceptors(FileInterceptor(fieldName)),
    ApiConsumes('multipart/form-data'),
    ApiBody({
      schema: {
        type: 'object',
        properties: {
          [fieldName]: {
            type: 'string',
            format: 'binary',
          },
        },
      },
    }),
  );
}

/**
 * Secure multiple files upload decorator
 */
export function SecureFilesUpload(
  fieldName: string,
  maxCount?: number,
  options?: SecureFileUploadOptions,
) {
  return applyDecorators(
    UseInterceptors(FilesInterceptor(fieldName, maxCount)),
    ApiConsumes('multipart/form-data'),
    ApiBody({
      schema: {
        type: 'object',
        properties: {
          [fieldName]: {
            type: 'array',
            items: {
              type: 'string',
              format: 'binary',
            },
          },
        },
      },
    }),
  );
}

/**
 * Secure file fields upload decorator
 */
export function SecureFileFieldsUpload(
  uploadFields: Array<{ name: string; maxCount?: number }>,
  options?: SecureFileUploadOptions,
) {
  const properties = uploadFields.reduce((acc, field) => {
    acc[field.name] = field.maxCount && field.maxCount > 1 
      ? {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
        }
      : {
          type: 'string',
          format: 'binary',
        };
    return acc;
  }, {} as Record<string, any>);

  return applyDecorators(
    UseInterceptors(FileFieldsInterceptor(uploadFields)),
    ApiConsumes('multipart/form-data'),
    ApiBody({
      schema: {
        type: 'object',
        properties,
      },
    }),
  );
}

/**
 * Avatar upload decorator (specialized for profile pictures)
 */
export function SecureAvatarUpload(fieldName: string = 'avatar') {
  return SecureFileUpload(fieldName, {
    context: 'avatar',
    maxFileSize: 5 * 1024 * 1024, // 5MB
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
    allowedExtensions: ['.jpg', '.jpeg', '.png', '.webp'],
    scanForMalware: true,
  });
}

/**
 * Document upload decorator (specialized for documents)
 */
export function SecureDocumentUpload(fieldName: string = 'document') {
  return SecureFileUpload(fieldName, {
    context: 'document',
    maxFileSize: 50 * 1024 * 1024, // 50MB
    allowedMimeTypes: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'text/csv',
    ],
    allowedExtensions: ['.pdf', '.doc', '.docx', '.txt', '.csv'],
    scanForMalware: true,
  });
}