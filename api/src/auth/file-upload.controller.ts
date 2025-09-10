import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  UploadedFile,
  UploadedFiles,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import {
  SecureFileUpload,
  SecureFilesUpload,
  SecureAvatarUpload,
  SecureDocumentUpload,
} from '../core/security/file-upload.decorator';
import { FileUploadSecurityService, UploadedFileInfo } from '../core/security/file-upload-security.service';
import { PrismaService } from '../core/database/prisma/prisma.service';

@ApiTags('File Upload')
@Controller('files')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class FileUploadController {
  constructor(
    private readonly fileUploadSecurity: FileUploadSecurityService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('avatar')
  @SecureAvatarUpload()
  @ApiOperation({ summary: 'Upload user avatar' })
  @ApiResponse({
    status: 201,
    description: 'Avatar uploaded successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        file: {
          type: 'object',
          properties: {
            originalName: { type: 'string' },
            sanitizedName: { type: 'string' },
            size: { type: 'number' },
            mimeType: { type: 'string' },
            hash: { type: 'string' },
            uploadPath: { type: 'string' },
          },
        },
      },
    },
  })
  async uploadAvatar(
    @Request() req: any,
    @UploadedFile() file: Express.Multer.File & { processedInfo?: UploadedFileInfo },
  ) {
    if (!file) {
      throw new Error('No file uploaded');
    }

    // TODO: Save file to storage (filesystem, S3, etc.)
    // TODO: Update user avatar URL in database
    
    return {
      message: 'Avatar uploaded successfully',
      file: file.processedInfo,
    };
  }

  @Post('documents')
  @SecureDocumentUpload()
  @ApiOperation({ summary: 'Upload document' })
  @ApiResponse({
    status: 201,
    description: 'Document uploaded successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        file: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            originalName: { type: 'string' },
            sanitizedName: { type: 'string' },
            size: { type: 'number' },
            mimeType: { type: 'string' },
            hash: { type: 'string' },
            uploadPath: { type: 'string' },
          },
        },
      },
    },
  })
  async uploadDocument(
    @Request() req: any,
    @UploadedFile() file: Express.Multer.File & { processedInfo?: UploadedFileInfo },
    @Body() metadata?: { description?: string; tags?: string[] },
  ) {
    if (!file) {
      throw new Error('No file uploaded');
    }

    // TODO: Save file to storage and create database record
    // For now, return processed file info
    
    return {
      message: 'Document uploaded successfully',
      file: {
        id: 'generated-uuid', // TODO: Generate actual UUID
        ...file.processedInfo,
        metadata,
      },
    };
  }

  @Post('multiple')
  @SecureFilesUpload('files', 5, {
    context: 'general',
    maxFileSize: 10 * 1024 * 1024, // 10MB per file
    validateContent: true,
  })
  @ApiOperation({ summary: 'Upload multiple files' })
  @ApiResponse({
    status: 201,
    description: 'Files uploaded successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        files: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              originalName: { type: 'string' },
              sanitizedName: { type: 'string' },
              size: { type: 'number' },
              mimeType: { type: 'string' },
              hash: { type: 'string' },
              uploadPath: { type: 'string' },
            },
          },
        },
      },
    },
  })
  async uploadMultipleFiles(
    @Request() req: any,
    @UploadedFiles() files: Array<Express.Multer.File & { processedInfo?: UploadedFileInfo }>,
  ) {
    if (!files || files.length === 0) {
      throw new Error('No files uploaded');
    }

    // TODO: Save files to storage and create database records
    
    return {
      message: `${files.length} files uploaded successfully`,
      files: files.map(file => file.processedInfo),
    };
  }

  @Get('upload-policy/:context')
  @ApiOperation({ summary: 'Get file upload policy for context' })
  @ApiResponse({
    status: 200,
    description: 'Upload policy retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        maxFileSize: { type: 'number' },
        maxFiles: { type: 'number' },
        allowedMimeTypes: { type: 'array', items: { type: 'string' } },
        allowedExtensions: { type: 'array', items: { type: 'string' } },
        scanForMalware: { type: 'boolean' },
      },
    },
  })
  async getUploadPolicy(
    @Request() req: any,
    @Param('context') context: 'avatar' | 'document' | 'general',
  ) {
    const policy = await this.fileUploadSecurity.generateUploadPolicy(
      req.user.userId,
      context,
    );

    return {
      context,
      policy: {
        maxFileSize: policy.maxFileSize,
        maxFiles: policy.maxFiles,
        allowedMimeTypes: policy.allowedMimeTypes,
        allowedExtensions: policy.allowedExtensions,
        scanForMalware: policy.scanForMalware,
      },
    };
  }

  @Post('validate')
  @SecureFileUpload('file', { validateContent: true })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Validate file without uploading' })
  @ApiResponse({
    status: 200,
    description: 'File validation result',
    schema: {
      type: 'object',
      properties: {
        isValid: { type: 'boolean' },
        errors: { type: 'array', items: { type: 'string' } },
        fileInfo: {
          type: 'object',
          properties: {
            originalName: { type: 'string' },
            size: { type: 'number' },
            mimeType: { type: 'string' },
            category: { type: 'string' },
          },
        },
      },
    },
  })
  async validateFile(
    @Request() req: any,
    @UploadedFile() file: Express.Multer.File & { processedInfo?: UploadedFileInfo },
  ) {
    if (!file) {
      throw new Error('No file provided for validation');
    }

    const validation = await this.fileUploadSecurity.validateFile(file);
    const category = this.fileUploadSecurity.getFileCategory(file.originalname);

    return {
      isValid: validation.isValid,
      errors: validation.errors,
      fileInfo: {
        originalName: file.originalname,
        size: file.size,
        mimeType: file.mimetype,
        category,
      },
    };
  }
}