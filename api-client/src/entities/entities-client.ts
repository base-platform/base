import { BaseApiClient } from '../core/base-client';
import {
  Entity,
  CreateEntityRequest,
  UpdateEntityRequest,
  EntityRecord,
  CreateEntityRecordRequest,
  UpdateEntityRecordRequest,
  EntityFilters,
  DynamicEntityFilters,
  PaginatedResponse,
  ValidationResult,
  RequestOptions,
} from '../types';

export class EntitiesClient extends BaseApiClient {
  /**
   * List all entities
   */
  async listEntities(filters?: EntityFilters, options?: RequestOptions): Promise<Entity[]> {
    return this.get<Entity[]>('/entities', {
      ...options,
      params: filters,
    });
  }

  /**
   * Get entity by ID
   */
  async getEntity(entityId: string, options?: RequestOptions): Promise<Entity> {
    return this.get<Entity>(`/entities/${entityId}`, options);
  }

  /**
   * Create a new entity
   */
  async createEntity(data: CreateEntityRequest, options?: RequestOptions): Promise<Entity> {
    return this.post<Entity>('/entities', data, options);
  }

  /**
   * Update an entity
   */
  async updateEntity(
    entityId: string,
    data: UpdateEntityRequest,
    options?: RequestOptions
  ): Promise<Entity> {
    return this.put<Entity>(`/entities/${entityId}`, data, options);
  }

  /**
   * Delete an entity
   */
  async deleteEntity(entityId: string, options?: RequestOptions): Promise<void> {
    await this.delete(`/entities/${entityId}`, options);
  }

  /**
   * List entity records
   */
  async listEntityRecords(
    entityId: string,
    filters?: DynamicEntityFilters,
    options?: RequestOptions
  ): Promise<PaginatedResponse<EntityRecord>> {
    return this.get<PaginatedResponse<EntityRecord>>(`/entities/${entityId}/records`, {
      ...options,
      params: filters,
    });
  }

  /**
   * Get entity record by ID
   */
  async getEntityRecord(
    entityId: string,
    recordId: string,
    options?: RequestOptions
  ): Promise<EntityRecord> {
    return this.get<EntityRecord>(`/entities/${entityId}/records/${recordId}`, options);
  }

  /**
   * Create entity record
   */
  async createEntityRecord(
    entityId: string,
    data: CreateEntityRecordRequest,
    options?: RequestOptions
  ): Promise<EntityRecord> {
    return this.post<EntityRecord>(`/entities/${entityId}/records`, data, options);
  }

  /**
   * Update entity record
   */
  async updateEntityRecord(
    entityId: string,
    recordId: string,
    data: UpdateEntityRecordRequest,
    options?: RequestOptions
  ): Promise<EntityRecord> {
    return this.put<EntityRecord>(`/entities/${entityId}/records/${recordId}`, data, options);
  }

  /**
   * Delete entity record
   */
  async deleteEntityRecord(
    entityId: string,
    recordId: string,
    options?: RequestOptions
  ): Promise<void> {
    await this.delete(`/entities/${entityId}/records/${recordId}`, options);
  }

  // ==========================================
  // Dynamic Entity Endpoints (Resource-First Pattern)
  // ==========================================

  /**
   * List records for a dynamic entity
   */
  async listDynamicRecords(
    entityName: string,
    filters?: DynamicEntityFilters,
    options?: RequestOptions
  ): Promise<PaginatedResponse<any>> {
    const params: any = {};
    
    if (filters?.page) params.page = filters.page;
    if (filters?.limit) params.limit = filters.limit;
    if (filters?.sort) params.sort = filters.sort;
    if (filters?.order) params.order = filters.order;
    if (filters?.filter) params.filter = JSON.stringify(filters.filter);

    return this.get<PaginatedResponse<any>>(`/${entityName}`, {
      ...options,
      params,
    });
  }

  /**
   * Get a specific record from a dynamic entity
   */
  async getDynamicRecord(
    entityName: string,
    recordId: string,
    options?: RequestOptions
  ): Promise<any> {
    return this.get<any>(`/${entityName}/${recordId}`, options);
  }

  /**
   * Create a new record in a dynamic entity
   */
  async createDynamicRecord(
    entityName: string,
    data: any,
    options?: RequestOptions
  ): Promise<any> {
    return this.post<any>(`/${entityName}`, data, options);
  }

  /**
   * Update a record in a dynamic entity
   */
  async updateDynamicRecord(
    entityName: string,
    recordId: string,
    data: any,
    options?: RequestOptions
  ): Promise<any> {
    return this.put<any>(`/${entityName}/${recordId}`, data, options);
  }

  /**
   * Delete a record from a dynamic entity
   */
  async deleteDynamicRecord(
    entityName: string,
    recordId: string,
    options?: RequestOptions
  ): Promise<void> {
    await this.delete(`/${entityName}/${recordId}`, options);
  }

  /**
   * Bulk create records in a dynamic entity
   */
  async bulkCreateDynamicRecords(
    entityName: string,
    records: any[],
    options?: RequestOptions
  ): Promise<{ created: number; failed?: number; records: any[]; errors?: any[] }> {
    return this.post<{ created: number; failed?: number; records: any[]; errors?: any[] }>(
      `/${entityName}/bulk`,
      { records },
      options
    );
  }

  /**
   * Validate data against a dynamic entity schema
   */
  async validateDynamicData(
    entityName: string,
    data: any,
    options?: RequestOptions
  ): Promise<ValidationResult> {
    return this.post<ValidationResult>(`/${entityName}/validate`, data, options);
  }

  /**
   * Export entity data
   */
  async exportEntityData(
    entityId: string,
    format: 'json' | 'csv' | 'excel' = 'json',
    options?: RequestOptions
  ): Promise<Blob> {
    return this.download(`/entities/${entityId}/export?format=${format}`, options);
  }

  /**
   * Import entity data
   */
  async importEntityData(
    entityId: string,
    file: File,
    options?: RequestOptions
  ): Promise<{ imported: number; failed: number; errors?: any[] }> {
    const formData = new FormData();
    formData.append('file', file);

    return this.upload<{ imported: number; failed: number; errors?: any[] }>(
      `/entities/${entityId}/import`,
      formData,
      options
    );
  }

  /**
   * Get entity schema
   */
  async getEntitySchema(entityId: string, options?: RequestOptions): Promise<any> {
    return this.get<any>(`/entities/${entityId}/schema`, options);
  }

  /**
   * Validate entity schema
   */
  async validateEntitySchema(schema: any, options?: RequestOptions): Promise<ValidationResult> {
    return this.post<ValidationResult>('/entities/validate-schema', { schema }, options);
  }
}