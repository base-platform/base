import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  BadRequestException,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { FileUploadSecurityService, FileUploadConfig } from './file-upload-security.service';
import { Request } from 'express';

export interface SecureFileUploadOptions extends Partial<FileUploadConfig> {
  context?: 'avatar' | 'document' | 'general';
  validateContent?: boolean;
}

@Injectable()
export class FileUploadSecurityInterceptor implements NestInterceptor {
  constructor(
    private readonly fileUploadSecurity: FileUploadSecurityService,
    private readonly options: SecureFileUploadOptions = {},
  ) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest<Request & { user?: any }>();
    
    // Get user ID if available
    const userId = request.user?.userId || 'anonymous';
    
    // Process uploaded files if present
    if (request.file) {
      await this.processFile(request.file, userId);
    } else if (request.files) {
      if (Array.isArray(request.files)) {
        // Handle multiple files as array
        await this.processFiles(request.files, userId);
      } else {
        // Handle multiple files as object with field names
        for (const fieldFiles of Object.values(request.files)) {
          if (Array.isArray(fieldFiles)) {
            await this.processFiles(fieldFiles, userId);
          } else {
            await this.processFile(fieldFiles, userId);
          }
        }
      }
    }

    return next.handle();
  }

  private async processFile(file: Express.Multer.File, userId: string): Promise<void> {
    try {
      // Get upload policy based on context
      const uploadPolicy = this.options.context 
        ? await this.fileUploadSecurity.generateUploadPolicy(userId, this.options.context, this.options)
        : { ...this.options } as FileUploadConfig;

      // Process the file with security checks
      const processedFile = await this.fileUploadSecurity.processUploadedFile(
        file,
        userId,
        uploadPolicy,
      );

      // Add processed file info to the request
      (file as any).processedInfo = processedFile;
      (file as any).isSecure = processedFile.isSecure;

    } catch (error) {
      throw new BadRequestException(`File upload security check failed: ${error.message}`);
    }
  }

  private async processFiles(files: Express.Multer.File[], userId: string): Promise<void> {
    if (this.options.maxFiles && files.length > this.options.maxFiles) {
      throw new BadRequestException(`Too many files. Maximum allowed: ${this.options.maxFiles}`);
    }

    for (const file of files) {
      await this.processFile(file, userId);
    }
  }
}