import { Injectable, BadRequestException, PayloadTooLargeException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SecuritySettingsService } from '../config/security-settings.service';
import * as path from 'path';
import * as crypto from 'crypto';
import * as multer from 'multer';

export interface FileValidationResult {
  isValid: boolean;
  errors: string[];
  sanitizedFilename?: string;
  detectedMimeType?: string;
}

export interface UploadedFileInfo {
  originalName: string;
  sanitizedName: string;
  size: number;
  mimeType: string;
  extension: string;
  hash: string;
  uploadPath: string;
  isSecure: boolean;
}

export interface FileUploadConfig {
  maxFileSize: number;
  maxFiles: number;
  allowedMimeTypes: string[];
  allowedExtensions: string[];
  scanForMalware: boolean;
  quarantineOnSuspicious: boolean;
  preserveOriginalName: boolean;
  uploadPath: string;
}

@Injectable()
export class FileUploadSecurityService {
  private readonly dangerousExtensions = new Set([
    '.exe', '.bat', '.cmd', '.com', '.pif', '.scr', '.vbs', '.js', '.jar',
    '.jsp', '.php', '.asp', '.aspx', '.sh', '.cgi', '.pl', '.py', '.rb',
    '.msi', '.deb', '.rpm', '.dmg', '.pkg', '.app', '.ipa', '.apk',
    '.dll', '.so', '.dylib', '.sys', '.drv', '.ocx', '.cpl', '.scf',
  ]);

  private readonly imageExtensions = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.tiff', '.svg']);
  private readonly documentExtensions = new Set(['.pdf', '.doc', '.docx', '.txt', '.rtf', '.odt']);
  private readonly archiveExtensions = new Set(['.zip', '.rar', '.7z', '.tar', '.gz', '.bz2']);

  constructor(
    private readonly config: ConfigService,
    private readonly securitySettings: SecuritySettingsService,
  ) {}

  private async getDefaultConfig(): Promise<FileUploadConfig> {
    return {
      maxFileSize: await this.securitySettings.getSetting<number>('file_upload.max_file_size_mb') * 1024 * 1024,
      maxFiles: await this.securitySettings.getSetting<number>('file_upload.max_files'),
      allowedMimeTypes: await this.securitySettings.getSetting<string[]>('file_upload.allowed_mime_types'),
      allowedExtensions: await this.securitySettings.getSetting<string[]>('file_upload.allowed_extensions'),
      scanForMalware: await this.securitySettings.getSetting<boolean>('file_upload.scan_for_malware'),
      quarantineOnSuspicious: await this.securitySettings.getSetting<boolean>('file_upload.quarantine_suspicious_files'),
      preserveOriginalName: false, // This could be a setting too
      uploadPath: './uploads', // This could be a setting too
    };
  }

  /**
   * Validate uploaded file for security issues
   */
  async validateFile(file: Express.Multer.File, customConfig?: Partial<FileUploadConfig>): Promise<FileValidationResult> {
    const defaultConfig = await this.getDefaultConfig();
    const config = { ...defaultConfig, ...customConfig };
    const errors: string[] = [];

    // Check file size
    if (file.size > config.maxFileSize) {
      errors.push(`File size (${this.formatBytes(file.size)}) exceeds maximum allowed size (${this.formatBytes(config.maxFileSize)})`);
    }

    // Check file extension
    const extension = path.extname(file.originalname).toLowerCase();
    if (!config.allowedExtensions.includes(extension)) {
      errors.push(`File extension '${extension}' is not allowed`);
    }

    // Check for dangerous extensions
    if (this.dangerousExtensions.has(extension)) {
      errors.push(`File extension '${extension}' is potentially dangerous and not allowed`);
    }

    // Check MIME type
    const mimeType = file.mimetype;
    const isMimeTypeAllowed = config.allowedMimeTypes.some(allowed => {
      if (allowed.endsWith('/*')) {
        return mimeType.startsWith(allowed.slice(0, -1));
      }
      return mimeType === allowed;
    });

    if (!isMimeTypeAllowed) {
      errors.push(`MIME type '${mimeType}' is not allowed`);
    }

    // Validate filename for malicious patterns
    const filename = file.originalname;
    if (this.containsMaliciousPatterns(filename)) {
      errors.push('Filename contains potentially malicious patterns');
    }

    // Check for double extensions (e.g., file.txt.exe)
    if (this.hasDoubleExtension(filename)) {
      errors.push('Files with double extensions are not allowed');
    }

    // Generate sanitized filename
    const sanitizedFilename = this.sanitizeFilename(filename);

    return {
      isValid: errors.length === 0,
      errors,
      sanitizedFilename,
      detectedMimeType: mimeType,
    };
  }

  /**
   * Scan file content for malicious patterns
   */
  async scanFileContent(file: Express.Multer.File): Promise<{ isSafe: boolean; threats: string[] }> {
    const threats: string[] = [];
    const content = file.buffer.toString('utf-8', 0, Math.min(file.buffer.length, 1024 * 10)); // First 10KB

    // Check for suspicious script patterns
    const scriptPatterns = [
      /<script[^>]*>.*?<\/script>/gis,
      /javascript:/gi,
      /vbscript:/gi,
      /data:text\/html/gi,
      /eval\s*\(/gi,
      /document\.write/gi,
      /window\.location/gi,
      /setTimeout\s*\(/gi,
      /setInterval\s*\(/gi,
    ];

    for (const pattern of scriptPatterns) {
      if (pattern.test(content)) {
        threats.push('Potentially malicious script detected');
        break;
      }
    }

    // Check for suspicious file headers
    if (this.hasSuspiciousFileHeader(file.buffer)) {
      threats.push('Suspicious file header detected');
    }

    // Check for embedded executables
    if (this.containsExecutableSignatures(file.buffer)) {
      threats.push('Embedded executable detected');
    }

    return {
      isSafe: threats.length === 0,
      threats,
    };
  }

  /**
   * Process and secure uploaded file
   */
  async processUploadedFile(
    file: Express.Multer.File,
    userId: string,
    customConfig?: Partial<FileUploadConfig>,
  ): Promise<UploadedFileInfo> {
    const defaultConfig = await this.getDefaultConfig();
    const config = { ...defaultConfig, ...customConfig };

    // Validate file
    const validation = await this.validateFile(file, config);
    if (!validation.isValid) {
      throw new BadRequestException(`File validation failed: ${validation.errors.join(', ')}`);
    }

    // Scan content if enabled
    if (config.scanForMalware) {
      const scanResult = await this.scanFileContent(file);
      if (!scanResult.isSafe) {
        if (config.quarantineOnSuspicious) {
          // In production, move file to quarantine directory
          console.warn(`File ${file.originalname} quarantined due to: ${scanResult.threats.join(', ')}`);
        }
        throw new BadRequestException(`File security scan failed: ${scanResult.threats.join(', ')}`);
      }
    }

    // Generate secure filename and hash
    const sanitizedName = validation.sanitizedFilename!;
    const hash = crypto.createHash('sha256').update(file.buffer).digest('hex');
    const extension = path.extname(sanitizedName);
    
    // Create unique filename to prevent collisions
    const uniqueFilename = config.preserveOriginalName 
      ? sanitizedName
      : `${hash.substring(0, 16)}_${Date.now()}${extension}`;

    const uploadPath = path.join(config.uploadPath, uniqueFilename);

    return {
      originalName: file.originalname,
      sanitizedName: uniqueFilename,
      size: file.size,
      mimeType: file.mimetype,
      extension,
      hash,
      uploadPath,
      isSecure: true,
    };
  }

  /**
   * Create multer configuration with security settings
   */
  async createMulterConfig(customConfig?: Partial<FileUploadConfig>): Promise<multer.Options> {
    const defaultConfig = await this.getDefaultConfig();
    const config = { ...defaultConfig, ...customConfig };

    return {
      limits: {
        fileSize: config.maxFileSize,
        files: config.maxFiles,
        fields: 10,
        fieldNameSize: 100,
        fieldSize: 1024 * 1024, // 1MB for field values
      },
      fileFilter: async (req, file, callback) => {
        const validation = await this.validateFile(file, config);
        if (validation.isValid) {
          callback(null, true);
        } else {
          callback(null, false);
        }
      },
      storage: multer.memoryStorage(), // Store in memory for processing
    };
  }

  /**
   * Get file type category
   */
  getFileCategory(filename: string): 'image' | 'document' | 'archive' | 'other' {
    const ext = path.extname(filename).toLowerCase();
    
    if (this.imageExtensions.has(ext)) return 'image';
    if (this.documentExtensions.has(ext)) return 'document';
    if (this.archiveExtensions.has(ext)) return 'archive';
    
    return 'other';
  }

  /**
   * Generate file upload policy for specific user/context
   */
  async generateUploadPolicy(
    userId: string,
    context: 'avatar' | 'document' | 'general',
    customConfig?: Partial<FileUploadConfig>,
  ): Promise<FileUploadConfig> {
    const defaultConfig = await this.getDefaultConfig();
    const baseConfig = { ...defaultConfig, ...customConfig };

    switch (context) {
      case 'avatar':
        return {
          ...baseConfig,
          maxFileSize: 5 * 1024 * 1024, // 5MB for avatars
          maxFiles: 1,
          allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
          allowedExtensions: ['.jpg', '.jpeg', '.png', '.webp'],
          uploadPath: `./uploads/avatars/${userId}`,
        };

      case 'document':
        return {
          ...baseConfig,
          maxFileSize: 50 * 1024 * 1024, // 50MB for documents
          allowedMimeTypes: [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'text/plain',
            'text/csv',
          ],
          allowedExtensions: ['.pdf', '.doc', '.docx', '.txt', '.csv'],
          uploadPath: `./uploads/documents/${userId}`,
        };

      default:
        return {
          ...baseConfig,
          uploadPath: `./uploads/general/${userId}`,
        };
    }
  }

  private sanitizeFilename(filename: string): string {
    // Remove or replace dangerous characters
    let sanitized = filename
      .replace(/[<>:"/\\|?*\x00-\x1f]/g, '_') // Remove control chars and dangerous chars
      .replace(/^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(\.|$)/i, '_$1$2') // Windows reserved names
      .replace(/\s+/g, '_') // Replace spaces with underscores
      .replace(/_{2,}/g, '_') // Replace multiple underscores with single
      .replace(/^_+|_+$/g, '') // Remove leading/trailing underscores
      .toLowerCase();

    // Ensure filename is not empty and has reasonable length
    if (!sanitized) {
      sanitized = 'file';
    }

    if (sanitized.length > 200) {
      const ext = path.extname(sanitized);
      sanitized = sanitized.substring(0, 200 - ext.length) + ext;
    }

    return sanitized;
  }

  private containsMaliciousPatterns(filename: string): boolean {
    const maliciousPatterns = [
      /\.\./,                    // Directory traversal
      /[<>:"/\\|?*]/,           // Dangerous filesystem characters
      /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(\.|$)/i, // Windows reserved names
      /\x00/,                   // Null bytes
      /\.(php|asp|jsp|cgi|pl|py|rb|sh|bat|cmd|exe)$/i, // Server-side scripts
    ];

    return maliciousPatterns.some(pattern => pattern.test(filename));
  }

  private hasDoubleExtension(filename: string): boolean {
    const parts = filename.split('.');
    if (parts.length < 3) return false;

    const lastTwo = parts.slice(-2).map(p => `.${p.toLowerCase()}`);
    return lastTwo.some(ext => this.dangerousExtensions.has(ext));
  }

  private hasSuspiciousFileHeader(buffer: Buffer): boolean {
    if (buffer.length < 4) return false;

    // Check for executable file signatures
    const executableSignatures = [
      [0x4D, 0x5A], // PE executable (MZ)
      [0x7F, 0x45, 0x4C, 0x46], // ELF executable
      [0xCF, 0xFA, 0xED, 0xFE], // Mach-O executable
      [0x50, 0x4B], // ZIP/JAR (could contain executables)
    ];

    return executableSignatures.some(signature => {
      return signature.every((byte, index) => buffer[index] === byte);
    });
  }

  private containsExecutableSignatures(buffer: Buffer): boolean {
    // Simple check for common executable patterns in file content
    const content = buffer.toString('hex');
    
    // Look for PE header
    if (content.includes('4d5a') && content.includes('504500')) {
      return true;
    }

    // Look for ELF header
    if (content.includes('7f454c46')) {
      return true;
    }

    return false;
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  }
}