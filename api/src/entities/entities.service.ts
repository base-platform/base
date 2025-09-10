import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../core/database/prisma/prisma.service';
import { CreateEntityDto, UpdateEntityDto, CreateEntityRecordDto, UpdateEntityRecordDto } from './dto/entity.dto';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

@Injectable()
export class EntitiesService {
  private ajv: Ajv;

  constructor(private prisma: PrismaService) {
    this.ajv = new Ajv({ allErrors: true, strict: false });
    addFormats(this.ajv);
  }

  async createEntity(userId: string, dto: CreateEntityDto) {
    const existingEntity = await this.prisma.entity.findUnique({
      where: { name: dto.name },
    });

    if (existingEntity) {
      throw new BadRequestException(`Entity with name ${dto.name} already exists`);
    }

    const entity = await this.prisma.entity.create({
      data: {
        name: dto.name,
        display_name: dto.displayName,
        description: dto.description,
        schema: dto.schema,
        is_active: dto.isActive ?? true,
        idempotency_enabled: dto.idempotencyEnabled ?? false,
        idempotency_ttl: dto.idempotencyTtl ?? 86400000, // 24 hours default
        idempotency_methods: dto.idempotencyMethods ?? ['POST', 'PUT'],
        created_by: userId,
      },
    });

    // Create nonce configuration if enabled
    if (dto.nonceEnabled) {
      await this.prisma.nonceConfig.create({
        data: {
          entity_id: entity.id,
          enabled: true,
          ttl: dto.nonceTtl ?? 300000, // 5 minutes default
          methods: dto.nonceMethods ?? ['POST', 'PUT', 'DELETE'],
          require_signature: dto.nonceRequireSignature ?? false,
          priority: 10,
        },
      });
    }

    await this.createApiEndpoints(entity.id);

    return entity;
  }

  async updateEntity(id: string, userId: string, dto: UpdateEntityDto) {
    const entity = await this.prisma.entity.findUnique({
      where: { id },
    });

    if (!entity) {
      throw new NotFoundException('Entity not found');
    }

    const updated = await this.prisma.entity.update({
      where: { id },
      data: {
        display_name: dto.displayName,
        description: dto.description,
        schema: dto.schema,
        is_active: dto.isActive,
        idempotency_enabled: dto.idempotencyEnabled,
        idempotency_ttl: dto.idempotencyTtl,
        idempotency_methods: dto.idempotencyMethods,
        version: { increment: 1 },
      },
    });

    // Update or create nonce configuration
    if (dto.nonceEnabled !== undefined) {
      const existingConfig = await this.prisma.nonceConfig.findFirst({
        where: { entity_id: id },
      });

      if (dto.nonceEnabled) {
        if (existingConfig) {
          await this.prisma.nonceConfig.update({
            where: { id: existingConfig.id },
            data: {
              enabled: true,
              ttl: dto.nonceTtl ?? existingConfig.ttl,
              methods: dto.nonceMethods ?? existingConfig.methods,
              require_signature: dto.nonceRequireSignature ?? existingConfig.require_signature,
            },
          });
        } else {
          await this.prisma.nonceConfig.create({
            data: {
              entity_id: id,
              enabled: true,
              ttl: dto.nonceTtl ?? 300000,
              methods: dto.nonceMethods ?? ['POST', 'PUT', 'DELETE'],
              require_signature: dto.nonceRequireSignature ?? false,
              priority: 10,
            },
          });
        }
      } else if (existingConfig) {
        // Disable nonce configuration
        await this.prisma.nonceConfig.update({
          where: { id: existingConfig.id },
          data: { enabled: false },
        });
      }
    }

    return updated;
  }

  async getEntities(filters?: { is_active?: boolean }) {
    return this.prisma.entity.findMany({
      where: filters,
      include: {
        _count: {
          select: { entity_records: true },
        },
      },
    });
  }

  async getEntity(id: string) {
    const entity = await this.prisma.entity.findUnique({
      where: { id },
      include: {
        api_endpoints: true,
        _count: {
          select: { entity_records: true },
        },
      },
    });

    if (!entity) {
      throw new NotFoundException('Entity not found');
    }

    return entity;
  }

  async deleteEntity(id: string) {
    const entity = await this.prisma.entity.findUnique({
      where: { id },
    });

    if (!entity) {
      throw new NotFoundException('Entity not found');
    }

    // Delete associated nonce configurations
    await this.prisma.nonceConfig.deleteMany({
      where: { entity_id: id },
    });

    await this.prisma.entity.delete({
      where: { id },
    });

    return { message: 'Entity deleted successfully' };
  }

  async createEntityRecord(entityId: string, userId: string, dto: CreateEntityRecordDto) {
    const entity = await this.prisma.entity.findUnique({
      where: { id: entityId },
    });

    if (!entity) {
      throw new NotFoundException('Entity not found');
    }

    if (!entity.is_active) {
      throw new BadRequestException('Entity is not active');
    }

    this.validateData(entity.schema, dto.data);

    const record = await this.prisma.entityRecord.create({
      data: {
        entity_id: entityId,
        data: dto.data,
        metadata: dto.metadata,
        created_by: userId,
      },
    });

    return record;
  }

  async updateEntityRecord(id: string, userId: string, dto: UpdateEntityRecordDto) {
    const record = await this.prisma.entityRecord.findUnique({
      where: { id },
      include: { entity: true },
    });

    if (!record) {
      throw new NotFoundException('Record not found');
    }

    this.validateData(record.entity.schema, dto.data);

    const updated = await this.prisma.entityRecord.update({
      where: { id },
      data: {
        data: dto.data,
        metadata: dto.metadata,
      },
    });

    return updated;
  }

  async getEntityRecords(entityId: string, pagination?: { page?: number; limit?: number }) {
    const page = pagination?.page || 1;
    const limit = pagination?.limit || 10;
    const skip = (page - 1) * limit;

    const [records, total] = await Promise.all([
      this.prisma.entityRecord.findMany({
        where: { entity_id: entityId },
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
      }),
      this.prisma.entityRecord.count({
        where: { entity_id: entityId },
      }),
    ]);

    return {
      data: records,
      meta: {
        page,
        pageSize: limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getEntityRecord(id: string) {
    const record = await this.prisma.entityRecord.findUnique({
      where: { id },
      include: { entity: true },
    });

    if (!record) {
      throw new NotFoundException('Record not found');
    }

    return record;
  }

  async deleteEntityRecord(id: string) {
    const record = await this.prisma.entityRecord.findUnique({
      where: { id },
    });

    if (!record) {
      throw new NotFoundException('Record not found');
    }

    await this.prisma.entityRecord.delete({
      where: { id },
    });

    return { message: 'Record deleted successfully' };
  }

  async getEntityByName(name: string) {
    const entity = await this.prisma.entity.findUnique({
      where: { name },
      include: {
        api_endpoints: true,
        _count: {
          select: { entity_records: true },
        },
      },
    });

    if (!entity) {
      throw new NotFoundException(`Entity '${name}' not found`);
    }

    return entity;
  }

  async validateDataAgainstSchema(schema: any, data: any) {
    this.validateData(schema, data);
  }

  private validateData(schema: any, data: any) {
    const validate = this.ajv.compile(schema);
    const valid = validate(data);

    if (!valid) {
      throw new BadRequestException({
        message: 'Data validation failed',
        errors: validate.errors,
      });
    }
  }

  private async createApiEndpoints(entityId: string) {
    const endpoints = [
      { method: 'GET', path: `/entities/${entityId}/records`, description: 'List entity records' },
      { method: 'POST', path: `/entities/${entityId}/records`, description: 'Create entity record' },
      { method: 'GET', path: `/entities/${entityId}/records/:id`, description: 'Get entity record' },
      { method: 'PUT', path: `/entities/${entityId}/records/:id`, description: 'Update entity record' },
      { method: 'DELETE', path: `/entities/${entityId}/records/:id`, description: 'Delete entity record' },
    ];

    await this.prisma.apiEndpoint.createMany({
      data: endpoints.map(endpoint => ({
        ...endpoint,
        entity_id: entityId,
      })),
    });
  }
}