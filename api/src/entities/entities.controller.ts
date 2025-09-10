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
  Request 
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { EntitiesService } from './entities.service';
import { CreateEntityDto, UpdateEntityDto, CreateEntityRecordDto, UpdateEntityRecordDto } from './dto/entity.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { NonceGuard } from '../common/guards/nonce.guard';

@ApiTags('Entities')
@Controller('entities')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class EntitiesController {
  constructor(private entitiesService: EntitiesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new entity' })
  async createEntity(@Request() req: any, @Body() dto: CreateEntityDto) {
    return this.entitiesService.createEntity(req.user.userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all entities' })
  async getEntities(@Query('isActive') isActive?: string) {
    const filters = isActive !== undefined ? { is_active: isActive === 'true' } : undefined;
    return this.entitiesService.getEntities(filters);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get entity by ID' })
  async getEntity(@Param('id') id: string) {
    return this.entitiesService.getEntity(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update entity' })
  async updateEntity(
    @Param('id') id: string,
    @Request() req: any,
    @Body() dto: UpdateEntityDto,
  ) {
    return this.entitiesService.updateEntity(id, req.user.userId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete entity' })
  async deleteEntity(@Param('id') id: string) {
    return this.entitiesService.deleteEntity(id);
  }

  @Post(':entityId/records')
  @UseGuards(NonceGuard)
  @ApiOperation({ summary: 'Create entity record' })
  async createEntityRecord(
    @Param('entityId') entityId: string,
    @Request() req: any,
    @Body() dto: CreateEntityRecordDto,
  ) {
    return this.entitiesService.createEntityRecord(entityId, req.user.userId, dto);
  }

  @Get(':entityId/records')
  @ApiOperation({ summary: 'Get entity records' })
  async getEntityRecords(
    @Param('entityId') entityId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pagination = {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 10,
    };
    return this.entitiesService.getEntityRecords(entityId, pagination);
  }

  @Get('records/:id')
  @ApiOperation({ summary: 'Get entity record by ID' })
  async getEntityRecord(@Param('id') id: string) {
    return this.entitiesService.getEntityRecord(id);
  }

  @Put('records/:id')
  @UseGuards(NonceGuard)
  @ApiOperation({ summary: 'Update entity record' })
  async updateEntityRecord(
    @Param('id') id: string,
    @Request() req: any,
    @Body() dto: UpdateEntityRecordDto,
  ) {
    return this.entitiesService.updateEntityRecord(id, req.user.userId, dto);
  }

  @Delete('records/:id')
  @UseGuards(NonceGuard)
  @ApiOperation({ summary: 'Delete entity record' })
  async deleteEntityRecord(@Param('id') id: string) {
    return this.entitiesService.deleteEntityRecord(id);
  }
}