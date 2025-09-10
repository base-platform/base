import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  Request,
  HttpCode,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { EntitiesService } from './entities.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiKeyAuthGuard } from '../auth/guards/api-key-auth.guard';
import { DynamicIdempotencyInterceptor } from './interceptors/dynamic-idempotency.interceptor';

@ApiTags('Dynamic Resources')
@Controller()
@UseInterceptors(DynamicIdempotencyInterceptor)
export class DynamicApiController {
  constructor(private entitiesService: EntitiesService) {}

  // Reserved paths that should not be handled by dynamic API
  private readonly reservedPaths = [
    'admin',
    'auth',
    'entities',
    'health',
    'api-keys',
    'dashboard',
    'files',
  ];

  private isReservedPath(entityName: string): boolean {
    return this.reservedPaths.includes(entityName.toLowerCase());
  }

  @Get(':entityName')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all records for a dynamic entity' })
  @ApiResponse({ status: 200, description: 'Records retrieved successfully' })
  async listRecords(
    @Param('entityName') entityName: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sort') sort?: string,
    @Query('filter') filter?: string,
  ) {
    // Skip reserved paths
    if (this.isReservedPath(entityName)) {
      throw new NotFoundException(`Entity '${entityName}' not found`);
    }

    const entity = await this.entitiesService.getEntityByName(entityName);
    
    const pagination = {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 10,
    };

    const records = await this.entitiesService.getEntityRecords(entity.id, pagination);
    
    // Apply filters if provided
    if (filter) {
      try {
        const filterObj = JSON.parse(filter);
        records.data = records.data.filter((record: any) => {
          for (const [key, value] of Object.entries(filterObj)) {
            if (record.data[key] !== value) {
              return false;
            }
          }
          return true;
        });
      } catch (e) {
        // Invalid filter format, ignore
      }
    }

    return records;
  }

  @Get(':entityName/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a specific record from a dynamic entity' })
  @ApiResponse({ status: 200, description: 'Record retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Record not found' })
  async getRecord(
    @Param('entityName') entityName: string,
    @Param('id') id: string,
  ) {
    // Skip reserved paths
    if (this.isReservedPath(entityName)) {
      throw new NotFoundException(`Entity '${entityName}' not found`);
    }

    const entity = await this.entitiesService.getEntityByName(entityName);
    return this.entitiesService.getEntityRecord(id);
  }

  @Post(':entityName')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new record in a dynamic entity' })
  @ApiResponse({ status: 201, description: 'Record created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid data' })
  async createRecord(
    @Param('entityName') entityName: string,
    @Request() req: any,
    @Body() body: any,
  ) {
    // Skip reserved paths
    if (this.isReservedPath(entityName)) {
      throw new NotFoundException(`Entity '${entityName}' not found`);
    }

    const entity = await this.entitiesService.getEntityByName(entityName);
    
    return this.entitiesService.createEntityRecord(
      entity.id,
      req.user.userId,
      { data: body, metadata: {} },
    );
  }

  @Put(':entityName/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a record in a dynamic entity' })
  @ApiResponse({ status: 200, description: 'Record updated successfully' })
  @ApiResponse({ status: 404, description: 'Record not found' })
  async updateRecord(
    @Param('entityName') entityName: string,
    @Param('id') id: string,
    @Request() req: any,
    @Body() body: any,
  ) {
    const entity = await this.entitiesService.getEntityByName(entityName);
    
    return this.entitiesService.updateEntityRecord(
      id,
      req.user.userId,
      { data: body, metadata: {} },
    );
  }

  @Delete(':entityName/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a record from a dynamic entity' })
  @ApiResponse({ status: 204, description: 'Record deleted successfully' })
  @ApiResponse({ status: 404, description: 'Record not found' })
  async deleteRecord(
    @Param('entityName') entityName: string,
    @Param('id') id: string,
  ) {
    const entity = await this.entitiesService.getEntityByName(entityName);
    await this.entitiesService.deleteEntityRecord(id);
  }

  @Post(':entityName/bulk')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Bulk create multiple records in a dynamic entity' })
  @ApiResponse({ status: 201, description: 'Records created successfully' })
  async bulkCreate(
    @Param('entityName') entityName: string,
    @Request() req: any,
    @Body() body: { records: any[] },
  ) {
    // Skip reserved paths
    if (this.isReservedPath(entityName)) {
      throw new NotFoundException(`Entity '${entityName}' not found`);
    }

    const entity = await this.entitiesService.getEntityByName(entityName);
    
    const results = await Promise.all(
      body.records.map(record =>
        this.entitiesService.createEntityRecord(
          entity.id,
          req.user.userId,
          { data: record, metadata: {} },
        ),
      ),
    );

    return { created: results.length, records: results };
  }

  @Post(':entityName/validate')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Validate data against a dynamic entity schema' })
  @ApiResponse({ status: 200, description: 'Validation result' })
  async validateData(
    @Param('entityName') entityName: string,
    @Body() body: any,
  ) {
    const entity = await this.entitiesService.getEntityByName(entityName);
    
    try {
      await this.entitiesService.validateDataAgainstSchema(entity.schema, body);
      return { valid: true, errors: null };
    } catch (error) {
      return { 
        valid: false, 
        errors: error.response?.errors || error.message 
      };
    }
  }
}