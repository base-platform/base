import { Injectable, BadRequestException } from '@nestjs/common';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

@Injectable()
export class SchemaValidatorService {
  private ajv: Ajv;

  constructor() {
    this.ajv = new Ajv({ 
      allErrors: true,
      strict: false,
      validateFormats: true,
    });
    addFormats(this.ajv);
  }

  validateJsonSchema(schema: any): void {
    try {
      // Check if it's a valid JSON Schema
      if (!schema.type || typeof schema.type !== 'string') {
        throw new Error('Schema must have a type property');
      }

      if (schema.type !== 'object') {
        throw new Error('Root schema type must be "object"');
      }

      if (!schema.properties || typeof schema.properties !== 'object') {
        throw new Error('Schema must have properties');
      }

      // Compile the schema to check for errors
      this.ajv.compile(schema);
    } catch (error) {
      throw new BadRequestException(`Invalid JSON Schema: ${error.message}`);
    }
  }

  validateData(schema: any, data: any): void {
    const validate = this.ajv.compile(schema);
    const valid = validate(data);

    if (!valid) {
      throw new BadRequestException({
        message: 'Data validation failed',
        errors: validate.errors,
      });
    }
  }

  generateSampleData(schema: any): any {
    const generateValue = (propertySchema: any): any => {
      if (propertySchema.enum) {
        return propertySchema.enum[0];
      }

      if (propertySchema.default !== undefined) {
        return propertySchema.default;
      }

      switch (propertySchema.type) {
        case 'string':
          if (propertySchema.format === 'email') return 'example@email.com';
          if (propertySchema.format === 'date') return '2024-01-01';
          if (propertySchema.format === 'date-time') return '2024-01-01T00:00:00Z';
          if (propertySchema.format === 'uri') return 'https://example.com';
          if (propertySchema.pattern) return 'pattern-match';
          return 'sample string';
        
        case 'number':
        case 'integer':
          if (propertySchema.minimum !== undefined) return propertySchema.minimum;
          if (propertySchema.maximum !== undefined) return propertySchema.maximum;
          return propertySchema.type === 'integer' ? 1 : 1.0;
        
        case 'boolean':
          return true;
        
        case 'array':
          if (propertySchema.items) {
            return [generateValue(propertySchema.items)];
          }
          return [];
        
        case 'object':
          if (propertySchema.properties) {
            const obj: any = {};
            for (const [key, propSchema] of Object.entries(propertySchema.properties)) {
              obj[key] = generateValue(propSchema as any);
            }
            return obj;
          }
          return {};
        
        default:
          return null;
      }
    };

    if (schema.type === 'object' && schema.properties) {
      const sample: any = {};
      for (const [key, propertySchema] of Object.entries(schema.properties)) {
        sample[key] = generateValue(propertySchema as any);
      }
      return sample;
    }

    return generateValue(schema);
  }

  generateOpenApiSchema(entityName: string, schema: any): any {
    return {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        data: schema,
        metadata: { type: 'object', additionalProperties: true },
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' },
      },
      required: ['id', 'data', 'createdAt', 'updatedAt'],
    };
  }
}