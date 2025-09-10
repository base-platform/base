import Ajv from "ajv";
import addFormats from "ajv-formats";

const ajv = new Ajv({ 
  allErrors: true, 
  verbose: true,
  strict: false,
  validateFormats: true,
});

// Add support for format validation (email, uri, date-time, etc.)
addFormats(ajv);

// Add custom formats if needed
ajv.addFormat("uuid", /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);

export interface ValidationResult {
  valid: boolean;
  errors?: Array<{
    field: string;
    message: string;
    keyword: string;
    params: any;
  }>;
}

/**
 * Validates data against a JSON schema
 */
export function validateDataAgainstSchema(data: any, schema: any): ValidationResult {
  try {
    const validate = ajv.compile(schema);
    const valid = validate(data);

    if (!valid && validate.errors) {
      const errors = validate.errors.map(error => ({
        field: error.instancePath ? error.instancePath.substring(1).replace(/\//g, '.') : 'root',
        message: getErrorMessage(error),
        keyword: error.keyword,
        params: error.params,
      }));

      return { valid: false, errors };
    }

    return { valid: true };
  } catch (error) {
    return { 
      valid: false, 
      errors: [{ 
        field: 'schema', 
        message: error instanceof Error ? error.message : 'Invalid schema',
        keyword: 'compile',
        params: {}
      }] 
    };
  }
}

/**
 * Validates if a string is valid JSON Schema
 */
export function validateJsonSchema(schemaString: string): ValidationResult {
  try {
    const schema = JSON.parse(schemaString);
    
    // Basic validation that it's an object with type
    if (typeof schema !== 'object' || !schema.type) {
      return { 
        valid: false, 
        errors: [{ 
          field: 'schema', 
          message: 'Schema must be an object with a "type" property',
          keyword: 'format',
          params: {}
        }] 
      };
    }

    // Try to compile it to check if it's valid
    ajv.compile(schema);
    
    return { valid: true };
  } catch (error) {
    return { 
      valid: false, 
      errors: [{ 
        field: 'schema', 
        message: error instanceof Error ? error.message : 'Invalid JSON schema',
        keyword: 'parse',
        params: {}
      }] 
    };
  }
}

/**
 * Helper function to generate human-readable error messages
 */
function getErrorMessage(error: any): string {
  const field = error.instancePath ? error.instancePath.substring(1) : 'value';
  
  switch (error.keyword) {
    case 'required':
      return `Missing required field: ${error.params.missingProperty}`;
    case 'type':
      return `${field} must be of type ${error.params.type}`;
    case 'minLength':
      return `${field} must be at least ${error.params.limit} characters`;
    case 'maxLength':
      return `${field} must be at most ${error.params.limit} characters`;
    case 'minimum':
      return `${field} must be at least ${error.params.limit}`;
    case 'maximum':
      return `${field} must be at most ${error.params.limit}`;
    case 'pattern':
      return `${field} does not match required pattern`;
    case 'format':
      return `${field} must be a valid ${error.params.format}`;
    case 'enum':
      return `${field} must be one of: ${error.params.allowedValues.join(', ')}`;
    case 'additionalProperties':
      return `${field} contains unexpected property: ${error.params.additionalProperty}`;
    default:
      return error.message || `${field} is invalid`;
  }
}

/**
 * Formats validation errors for display
 */
export function formatValidationErrors(errors: ValidationResult['errors']): string {
  if (!errors || errors.length === 0) return '';
  
  return errors
    .map(error => `• ${error.message}`)
    .join('\n');
}