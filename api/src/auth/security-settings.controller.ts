import {
  Controller,
  Get,
  Put,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  ForbiddenException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { SecuritySettingsService } from '../core/config/security-settings.service';
import { IsString, IsOptional, IsObject, IsNotEmpty } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateSettingDto {
  @ApiProperty()
  @IsNotEmpty()
  value: any;
}

export class BulkUpdateSettingsDto {
  @ApiProperty({
    description: 'Object with setting keys and their new values',
    example: {
      rateLimitDefault: 100,
      passwordMinLength: 8,
      mfaRequiredForAdmin: true,
    },
  })
  @IsObject()
  @IsNotEmpty()
  settings: Record<string, any>;
}

@ApiTags('Security Settings')
@Controller('admin/security-settings')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SecuritySettingsController {
  constructor(private readonly settingsService: SecuritySettingsService) {}

  private checkAdminPermission(user: any): void {
    if (user.role !== 'admin') {
      throw new ForbiddenException('Admin access required');
    }
  }

  @Get('categories')
  @ApiOperation({ summary: 'Get all setting categories' })
  @ApiResponse({
    status: 200,
    description: 'List of setting categories',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          description: { type: 'string' },
        },
      },
    },
  })
  async getCategories(@Request() req: any) {
    this.checkAdminPermission(req.user);
    return this.settingsService.getCategories();
  }

  @Get('definitions')
  @ApiOperation({ summary: 'Get all setting definitions' })
  @ApiResponse({
    status: 200,
    description: 'List of all setting definitions',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          key: { type: 'string' },
          category: { type: 'string' },
          type: { type: 'string' },
          defaultValue: {},
          description: { type: 'string' },
          validation: { type: 'object' },
          isPublic: { type: 'boolean' },
        },
      },
    },
  })
  async getDefinitions(@Request() req: any) {
    this.checkAdminPermission(req.user);
    return this.settingsService.getSettingDefinitions();
  }

  @Get('all')
  @ApiOperation({ summary: 'Get all security settings with current values' })
  @ApiResponse({
    status: 200,
    description: 'All security settings',
    schema: {
      type: 'object',
      properties: {
        rateLimitDefault: { type: 'number' },
        sessionTtlHours: { type: 'number' },
        passwordMinLength: { type: 'number' },
        lockoutMaxAttempts: { type: 'number' },
        fileUploadMaxSize: { type: 'number' },
        mfaBackupCodeCount: { type: 'number' },
        apiKeyDefaultExpirationDays: { type: 'number' },
        auditLogRetentionDays: { type: 'number' },
      },
    },
  })
  async getAllSettings(@Request() req: any) {
    this.checkAdminPermission(req.user);
    return this.settingsService.getAllSettings();
  }

  @Get('category/:category')
  @ApiOperation({ summary: 'Get settings by category' })
  @ApiResponse({
    status: 200,
    description: 'Settings for the specified category',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          key: { type: 'string' },
          value: {},
          description: { type: 'string' },
          type: { type: 'string' },
          validation: { type: 'object' },
        },
      },
    },
  })
  async getSettingsByCategory(
    @Request() req: any,
    @Param('category') category: string,
  ) {
    this.checkAdminPermission(req.user);
    return this.settingsService.getSettingsByCategory(category);
  }

  @Get(':key')
  @ApiOperation({ summary: 'Get a specific setting value' })
  @ApiResponse({
    status: 200,
    description: 'Setting value',
    schema: {
      type: 'object',
      properties: {
        key: { type: 'string' },
        value: {},
        definition: {
          type: 'object',
          properties: {
            type: { type: 'string' },
            description: { type: 'string' },
            validation: { type: 'object' },
          },
        },
      },
    },
  })
  async getSetting(@Request() req: any, @Param('key') key: string) {
    this.checkAdminPermission(req.user);
    
    const value = await this.settingsService.getSetting(key);
    const definition = this.settingsService
      .getSettingDefinitions()
      .find(def => def.key === key);

    return {
      key,
      value,
      definition,
    };
  }

  @Put(':key')
  @ApiOperation({ summary: 'Update a specific setting' })
  @ApiResponse({
    status: 200,
    description: 'Setting updated successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        key: { type: 'string' },
        oldValue: {},
        newValue: {},
      },
    },
  })
  async updateSetting(
    @Request() req: any,
    @Param('key') key: string,
    @Body() dto: UpdateSettingDto,
  ) {
    this.checkAdminPermission(req.user);

    const oldValue = await this.settingsService.getSetting(key);
    await this.settingsService.updateSetting(key, dto.value, req.user.userId);

    return {
      message: 'Setting updated successfully',
      key,
      oldValue,
      newValue: dto.value,
    };
  }

  @Put()
  @ApiOperation({ summary: 'Bulk update multiple settings' })
  @ApiResponse({
    status: 200,
    description: 'Settings updated successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        updated: { type: 'array', items: { type: 'string' } },
        errors: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              key: { type: 'string' },
              error: { type: 'string' },
            },
          },
        },
      },
    },
  })
  async bulkUpdateSettings(
    @Request() req: any,
    @Body() dto: BulkUpdateSettingsDto,
  ) {
    this.checkAdminPermission(req.user);

    const updated: string[] = [];
    const errors: Array<{ key: string; error: string }> = [];

    for (const [key, value] of Object.entries(dto.settings)) {
      try {
        await this.settingsService.updateSetting(key, value, req.user.userId);
        updated.push(key);
      } catch (error) {
        errors.push({
          key,
          error: error.message,
        });
      }
    }

    return {
      message: `Updated ${updated.length} settings with ${errors.length} errors`,
      updated,
      errors,
    };
  }

  @Post(':key/reset')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset setting to default value' })
  @ApiResponse({
    status: 200,
    description: 'Setting reset successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        key: { type: 'string' },
        defaultValue: {},
      },
    },
  })
  async resetSetting(@Request() req: any, @Param('key') key: string) {
    this.checkAdminPermission(req.user);

    const definition = this.settingsService
      .getSettingDefinitions()
      .find(def => def.key === key);

    if (!definition) {
      throw new Error(`Unknown setting key: ${key}`);
    }

    await this.settingsService.resetSetting(key, req.user.userId);

    return {
      message: 'Setting reset to default value',
      key,
      defaultValue: definition.defaultValue,
    };
  }

  @Get('validation/test')
  @ApiOperation({ summary: 'Test setting validation' })
  @ApiQuery({ name: 'key', type: 'string' })
  @ApiQuery({ name: 'value', type: 'string' })
  @ApiResponse({
    status: 200,
    description: 'Validation result',
    schema: {
      type: 'object',
      properties: {
        valid: { type: 'boolean' },
        error: { type: 'string' },
        key: { type: 'string' },
        value: {},
      },
    },
  })
  async testValidation(
    @Request() req: any,
    @Query('key') key: string,
    @Query('value') value: string,
  ) {
    this.checkAdminPermission(req.user);

    try {
      const definition = this.settingsService
        .getSettingDefinitions()
        .find(def => def.key === key);

      if (!definition) {
        return {
          valid: false,
          error: `Unknown setting key: ${key}`,
          key,
          value,
        };
      }

      // Convert string value to appropriate type
      let parsedValue: any = value;
      if (definition.type === 'number') {
        parsedValue = Number(value);
      } else if (definition.type === 'boolean') {
        parsedValue = value === 'true';
      } else if (definition.type === 'array') {
        try {
          parsedValue = JSON.parse(value);
        } catch {
          parsedValue = value.split(',').map(v => v.trim());
        }
      } else if (definition.type === 'object') {
        parsedValue = JSON.parse(value);
      }

      // This will throw if validation fails
      await this.settingsService.updateSetting(key, parsedValue, req.user.userId);
      
      return {
        valid: true,
        key,
        value: parsedValue,
      };
    } catch (error) {
      return {
        valid: false,
        error: error.message,
        key,
        value,
      };
    }
  }

  @Get('export/json')
  @ApiOperation({ summary: 'Export all settings as JSON' })
  @ApiResponse({
    status: 200,
    description: 'Settings exported as JSON',
    schema: {
      type: 'object',
      properties: {
        timestamp: { type: 'string' },
        settings: { type: 'object' },
        metadata: {
          type: 'object',
          properties: {
            exportedBy: { type: 'string' },
            totalSettings: { type: 'number' },
          },
        },
      },
    },
  })
  async exportSettings(@Request() req: any) {
    this.checkAdminPermission(req.user);

    const settings = await this.settingsService.getAllSettings();

    return {
      timestamp: new Date().toISOString(),
      settings,
      metadata: {
        exportedBy: req.user.email,
        totalSettings: Object.keys(settings).length,
      },
    };
  }

  @Post('import/json')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Import settings from JSON' })
  @ApiResponse({
    status: 200,
    description: 'Settings imported successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        imported: { type: 'array', items: { type: 'string' } },
        skipped: { type: 'array', items: { type: 'string' } },
        errors: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              key: { type: 'string' },
              error: { type: 'string' },
            },
          },
        },
      },
    },
  })
  async importSettings(
    @Request() req: any,
    @Body() importData: { settings: Record<string, any> },
  ) {
    this.checkAdminPermission(req.user);

    const imported: string[] = [];
    const skipped: string[] = [];
    const errors: Array<{ key: string; error: string }> = [];

    const validKeys = new Set(
      this.settingsService.getSettingDefinitions().map(def => def.key)
    );

    for (const [key, value] of Object.entries(importData.settings)) {
      if (!validKeys.has(key)) {
        skipped.push(key);
        continue;
      }

      try {
        await this.settingsService.updateSetting(key, value, req.user.userId);
        imported.push(key);
      } catch (error) {
        errors.push({
          key,
          error: error.message,
        });
      }
    }

    return {
      message: `Imported ${imported.length} settings, skipped ${skipped.length}, ${errors.length} errors`,
      imported,
      skipped,
      errors,
    };
  }
}