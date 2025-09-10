import { BaseApiClient } from '../core/base-client';
import { RequestOptions } from '../types';

export interface UploadResponse {
  url: string;
  key: string;
  filename: string;
  mimetype: string;
  size: number;
  metadata?: Record<string, any>;
}

export interface UploadPolicy {
  maxSize: number;
  allowedTypes: string[];
  allowedExtensions: string[];
  scanForVirus: boolean;
  requireAuth: boolean;
  expiresIn?: number;
}

export interface FileValidationRequest {
  filename: string;
  mimetype: string;
  size: number;
  context: 'avatar' | 'document' | 'general';
}

export interface MultipleUploadResponse {
  succeeded: UploadResponse[];
  failed: Array<{
    filename: string;
    error: string;
  }>;
}

/**
 * Client for File Upload operations
 */
export class FileUploadClient extends BaseApiClient {
  /**
   * Upload avatar image
   */
  async uploadAvatar(file: File, options?: RequestOptions): Promise<UploadResponse> {
    const formData = new FormData();
    formData.append('file', file);
    
    return this.post<UploadResponse>('/auth/uploads/avatar', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      ...options
    });
  }

  /**
   * Upload document
   */
  async uploadDocument(file: File, metadata?: Record<string, any>, options?: RequestOptions): Promise<UploadResponse> {
    const formData = new FormData();
    formData.append('file', file);
    if (metadata) {
      formData.append('metadata', JSON.stringify(metadata));
    }
    
    return this.post<UploadResponse>('/auth/uploads/documents', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      ...options
    });
  }

  /**
   * Upload multiple files
   */
  async uploadMultiple(files: File[], options?: RequestOptions): Promise<MultipleUploadResponse> {
    const formData = new FormData();
    files.forEach((file, index) => {
      formData.append(`files`, file);
    });
    
    return this.post<MultipleUploadResponse>('/auth/uploads/multiple', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      ...options
    });
  }

  /**
   * Get upload policy for a context
   */
  async getUploadPolicy(context: 'avatar' | 'document' | 'general', options?: RequestOptions): Promise<UploadPolicy> {
    return this.get<UploadPolicy>(`/auth/uploads/upload-policy/${context}`, options);
  }

  /**
   * Validate file before upload
   */
  async validateFile(data: FileValidationRequest, options?: RequestOptions): Promise<{ valid: boolean; errors?: string[] }> {
    return this.post<{ valid: boolean; errors?: string[] }>('/auth/uploads/validate', data, options);
  }

  /**
   * Delete uploaded file
   */
  async deleteFile(fileKey: string, options?: RequestOptions): Promise<void> {
    await this.delete(`/auth/uploads/${fileKey}`, options);
  }

  /**
   * Get signed URL for private file
   */
  async getSignedUrl(fileKey: string, expiresIn?: number, options?: RequestOptions): Promise<{ url: string; expiresAt: string }> {
    return this.get<{ url: string; expiresAt: string }>(`/auth/uploads/${fileKey}/signed-url`, {
      params: expiresIn ? { expiresIn } : undefined,
      ...options
    });
  }

  /**
   * Upload file using chunked upload for large files
   */
  async uploadChunked(
    file: File,
    onProgress?: (progress: number) => void,
    options?: RequestOptions
  ): Promise<UploadResponse> {
    const chunkSize = 1024 * 1024 * 5; // 5MB chunks
    const totalChunks = Math.ceil(file.size / chunkSize);
    const uploadId = Math.random().toString(36).substring(7);
    
    for (let i = 0; i < totalChunks; i++) {
      const start = i * chunkSize;
      const end = Math.min(start + chunkSize, file.size);
      const chunk = file.slice(start, end);
      
      const formData = new FormData();
      formData.append('chunk', chunk);
      formData.append('uploadId', uploadId);
      formData.append('chunkIndex', i.toString());
      formData.append('totalChunks', totalChunks.toString());
      formData.append('filename', file.name);
      
      await this.post('/auth/uploads/chunk', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        ...options
      });
      
      if (onProgress) {
        onProgress(((i + 1) / totalChunks) * 100);
      }
    }
    
    // Complete the upload
    return this.post<UploadResponse>('/auth/uploads/complete', {
      uploadId,
      filename: file.name,
      mimetype: file.type,
      size: file.size
    }, options);
  }
}