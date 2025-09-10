import { EntitiesClient } from '../../src/entities/entities-client';
import { axiosMock } from '../utils/axios-mock';
import { MockFactory } from '../utils/mock-factory';

describe('EntitiesClient', () => {
  let entitiesClient: EntitiesClient;
  const baseUrl = 'http://localhost:3001/api/v1';

  beforeEach(() => {
    axiosMock.reset();
    entitiesClient = new EntitiesClient({ baseUrl });
  });

  describe('Entity CRUD Operations', () => {
    describe('listEntities', () => {
      it('should list entities with filters', async () => {
        const entities = [
          MockFactory.createEntity({ name: 'products' }),
          MockFactory.createEntity({ name: 'users' }),
        ];
        
        axiosMock.mockGet('/entities', entities);

        const result = await entitiesClient.listEntities({ isActive: true });
        
        expect(result).toEqual(entities);
        expect(result).toHaveLength(2);
      });

      it('should filter entities by active status', async () => {
        const activeEntities = [MockFactory.createEntity({ isActive: true })];
        const response = MockFactory.createPaginatedResponse(activeEntities);
        
        const instance = axiosMock.getMockedInstance();
        (instance.get as jest.Mock).mockResolvedValueOnce(
          MockFactory.createResponse(response)
        );

        await entitiesClient.listEntities({ isActive: true });
        
        expect(instance.get).toHaveBeenCalledWith(
          '/entities',
          expect.objectContaining({
            params: { isActive: true }
          })
        );
      });

      it('should search entities', async () => {
        const instance = axiosMock.getMockedInstance();
        const response = MockFactory.createPaginatedResponse([]);
        
        (instance.get as jest.Mock).mockResolvedValueOnce(
          MockFactory.createResponse(response)
        );

        await entitiesClient.listEntities({ search: 'product' });
        
        expect(instance.get).toHaveBeenCalledWith(
          '/entities',
          expect.objectContaining({
            params: { search: 'product' }
          })
        );
      });
    });

    describe('getEntity', () => {
      it('should get entity by ID', async () => {
        const entity = MockFactory.createEntity();
        axiosMock.mockGet(`/entities/${entity.id}`, entity);

        const result = await entitiesClient.getEntity(entity.id);
        expect(result).toEqual(entity);
      });

      it('should handle entity not found', async () => {
        const entityId = 'non-existent';
        axiosMock.mockError('get', `/entities/${entityId}`, 404, 'Entity not found');

        await expect(entitiesClient.getEntity(entityId))
          .rejects.toMatchObject({
            statusCode: 404,
            message: 'Entity not found',
          });
      });
    });

    describe('createEntity', () => {
      it('should create entity successfully', async () => {
        const createRequest = {
          name: 'products',
          displayName: 'Products',
          description: 'Product catalog',
          schema: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              price: { type: 'number' },
            },
            required: ['name', 'price'],
          },
        };
        const entity = MockFactory.createEntity(createRequest);
        
        axiosMock.mockPost('/entities', entity);

        const result = await entitiesClient.createEntity(createRequest);
        expect(result).toEqual(entity);
      });

      it('should handle duplicate entity name', async () => {
        const createRequest = {
          name: 'existing',
          displayName: 'Existing',
          schema: {},
        };
        
        axiosMock.mockError('post', '/entities', 409, 'Entity name already exists');

        await expect(entitiesClient.createEntity(createRequest))
          .rejects.toMatchObject({
            statusCode: 409,
            message: 'Entity name already exists',
          });
      });

      it('should handle invalid schema', async () => {
        const createRequest = {
          name: 'invalid',
          displayName: 'Invalid',
          schema: { invalid: 'schema' },
        };
        
        axiosMock.mockError('post', '/entities', 400, 'Invalid JSON schema');

        await expect(entitiesClient.createEntity(createRequest))
          .rejects.toMatchObject({
            statusCode: 400,
            message: 'Invalid JSON schema',
          });
      });
    });

    describe('updateEntity', () => {
      it('should update entity successfully', async () => {
        const entityId = 'entity-123';
        const updateRequest = {
          displayName: 'Updated Products',
          description: 'Updated description',
        };
        const updatedEntity = MockFactory.createEntity({
          id: entityId,
          ...updateRequest,
        });
        
        axiosMock.mockPut(`/entities/${entityId}`, updatedEntity);

        const result = await entitiesClient.updateEntity(entityId, updateRequest);
        expect(result).toEqual(updatedEntity);
      });

      it('should handle schema version conflict', async () => {
        const entityId = 'entity-123';
        const updateRequest = { schema: { updated: true } };
        
        axiosMock.mockError('put', `/entities/${entityId}`, 409, 'Schema version conflict');

        await expect(entitiesClient.updateEntity(entityId, updateRequest))
          .rejects.toMatchObject({
            statusCode: 409,
            message: 'Schema version conflict',
          });
      });
    });

    describe('deleteEntity', () => {
      it('should delete entity successfully', async () => {
        const entityId = 'entity-123';
        axiosMock.mockDelete(`/entities/${entityId}`);

        await expect(entitiesClient.deleteEntity(entityId))
          .resolves.toBeUndefined();
      });

      it('should handle entity with existing records', async () => {
        const entityId = 'entity-123';
        axiosMock.mockError('delete', `/entities/${entityId}`, 400, 'Cannot delete entity with existing records');

        await expect(entitiesClient.deleteEntity(entityId))
          .rejects.toMatchObject({
            statusCode: 400,
            message: 'Cannot delete entity with existing records',
          });
      });
    });
  });

  describe('Entity Record Operations', () => {
    describe('listEntityRecords', () => {
      it('should list entity records', async () => {
        const entityId = 'entity-123';
        const records = [
          MockFactory.createEntityRecord(),
          MockFactory.createEntityRecord(),
        ];
        const paginatedResponse = MockFactory.createPaginatedResponse(records);
        
        axiosMock.mockGet(`/entities/${entityId}/records`, paginatedResponse);

        const result = await entitiesClient.listEntityRecords(entityId);
        expect(result).toEqual(paginatedResponse);
      });

      it('should support filtering and pagination', async () => {
        const entityId = 'entity-123';
        const instance = axiosMock.getMockedInstance();
        const response = MockFactory.createPaginatedResponse([]);
        
        (instance.get as jest.Mock).mockResolvedValueOnce(
          MockFactory.createResponse(response)
        );

        await entitiesClient.listEntityRecords(entityId, {
          page: 2,
          limit: 20,
          filter: { status: 'active' },
        });
        
        expect(instance.get).toHaveBeenCalledWith(
          `/entities/${entityId}/records`,
          expect.objectContaining({
            params: {
              page: 2,
              limit: 20,
              filter: { status: 'active' },
            }
          })
        );
      });
    });

    describe('createEntityRecord', () => {
      it('should create entity record successfully', async () => {
        const entityId = 'entity-123';
        const recordData = {
          data: { name: 'Product 1', price: 99.99 },
          metadata: { created_by: 'user-123' },
        };
        const record = MockFactory.createEntityRecord({
          entityId,
          ...recordData,
        });
        
        axiosMock.mockPost(`/entities/${entityId}/records`, record);

        const result = await entitiesClient.createEntityRecord(entityId, recordData);
        expect(result).toEqual(record);
      });

      it('should handle validation errors', async () => {
        const entityId = 'entity-123';
        const invalidData = { data: { price: 'not-a-number' } };
        
        axiosMock.mockError('post', `/entities/${entityId}/records`, 400, 'Validation failed');

        await expect(entitiesClient.createEntityRecord(entityId, invalidData))
          .rejects.toMatchObject({
            statusCode: 400,
            message: 'Validation failed',
          });
      });
    });

    describe('updateEntityRecord', () => {
      it('should update entity record successfully', async () => {
        const entityId = 'entity-123';
        const recordId = 'record-123';
        const updateData = {
          data: { price: 89.99 },
        };
        const updatedRecord = MockFactory.createEntityRecord({
          id: recordId,
          ...updateData,
        });
        
        axiosMock.mockPut(`/entities/${entityId}/records/${recordId}`, updatedRecord);

        const result = await entitiesClient.updateEntityRecord(entityId, recordId, updateData);
        expect(result).toEqual(updatedRecord);
      });
    });

    describe('deleteEntityRecord', () => {
      it('should delete entity record successfully', async () => {
        const entityId = 'entity-123';
        const recordId = 'record-123';
        axiosMock.mockDelete(`/entities/${entityId}/records/${recordId}`);

        await expect(entitiesClient.deleteEntityRecord(entityId, recordId))
          .resolves.toBeUndefined();
      });
    });
  });

  describe('Dynamic API Operations', () => {
    describe('listDynamicRecords', () => {
      it('should list dynamic records for entity', async () => {
        const entityName = 'products';
        const records = [
          { id: '1', name: 'Product 1', price: 99.99 },
          { id: '2', name: 'Product 2', price: 149.99 },
        ];
        const paginatedResponse = MockFactory.createPaginatedResponse(records);
        
        axiosMock.mockGet(`/${entityName}`, paginatedResponse);

        const result = await entitiesClient.listDynamicRecords(entityName);
        expect(result).toEqual(paginatedResponse);
      });

      it('should support complex filtering', async () => {
        const entityName = 'products';
        const instance = axiosMock.getMockedInstance();
        const response = MockFactory.createPaginatedResponse([]);
        
        (instance.get as jest.Mock).mockResolvedValueOnce(
          MockFactory.createResponse(response)
        );

        await entitiesClient.listDynamicRecords(entityName, {
          filter: {
            price: { $gte: 50, $lte: 200 },
            category: 'electronics',
          },
          sort: 'price',
          order: 'desc',
        });
        
        expect(instance.get).toHaveBeenCalledWith(
          `/${entityName}`,
          expect.objectContaining({
            params: {
              filter: JSON.stringify({
                price: { $gte: 50, $lte: 200 },
                category: 'electronics',
              }),
              sort: 'price',
              order: 'desc',
            }
          })
        );
      });
    });

    describe('getDynamicRecord', () => {
      it('should get dynamic record by ID', async () => {
        const entityName = 'products';
        const recordId = '123';
        const record = { id: recordId, name: 'Product', price: 99.99 };
        
        axiosMock.mockGet(`/${entityName}/${recordId}`, record);

        const result = await entitiesClient.getDynamicRecord(entityName, recordId);
        expect(result).toEqual(record);
      });
    });

    describe('createDynamicRecord', () => {
      it('should create dynamic record', async () => {
        const entityName = 'products';
        const data = { name: 'New Product', price: 199.99 };
        const createdRecord = { id: '123', ...data };
        
        axiosMock.mockPost(`/${entityName}`, createdRecord);

        const result = await entitiesClient.createDynamicRecord(entityName, data);
        expect(result).toEqual(createdRecord);
      });
    });

    describe('updateDynamicRecord', () => {
      it('should update dynamic record', async () => {
        const entityName = 'products';
        const recordId = '123';
        const updates = { price: 179.99 };
        const updatedRecord = { id: recordId, name: 'Product', ...updates };
        
        axiosMock.mockPut(`/${entityName}/${recordId}`, updatedRecord);

        const result = await entitiesClient.updateDynamicRecord(entityName, recordId, updates);
        expect(result).toEqual(updatedRecord);
      });
    });

    describe('deleteDynamicRecord', () => {
      it('should delete dynamic record', async () => {
        const entityName = 'products';
        const recordId = '123';
        
        axiosMock.mockDelete(`/${entityName}/${recordId}`);

        await expect(entitiesClient.deleteDynamicRecord(entityName, recordId))
          .resolves.toBeUndefined();
      });
    });

    describe('bulkCreateDynamicRecords', () => {
      it('should bulk create records', async () => {
        const entityName = 'products';
        const records = [
          { name: 'Product 1', price: 99.99 },
          { name: 'Product 2', price: 149.99 },
        ];
        const response = {
          created: 2,
          failed: 0,
          records: records.map((r, i) => ({ id: `${i + 1}`, ...r })),
        };
        
        axiosMock.mockPost(`/${entityName}/bulk`, response);

        const result = await entitiesClient.bulkCreateDynamicRecords(entityName, records);
        expect(result).toEqual(response);
        expect(result.created).toBe(2);
      });

      it('should handle partial failures', async () => {
        const entityName = 'products';
        const records = [
          { name: 'Valid', price: 99.99 },
          { name: 'Invalid', price: 'not-a-number' },
        ];
        const response = {
          created: 1,
          failed: 1,
          records: [{ id: '1', name: 'Valid', price: 99.99 }],
          errors: [{ index: 1, error: 'Invalid price' }],
        };
        
        axiosMock.mockPost(`/${entityName}/bulk`, response);

        const result = await entitiesClient.bulkCreateDynamicRecords(entityName, records);
        expect(result.created).toBe(1);
        expect(result.failed).toBe(1);
        expect(result.errors).toHaveLength(1);
      });
    });

    describe('validateDynamicData', () => {
      it('should validate data successfully', async () => {
        const entityName = 'products';
        const data = { name: 'Test', price: 99.99 };
        const validation = { valid: true };
        
        axiosMock.mockPost(`/${entityName}/validate`, validation);

        const result = await entitiesClient.validateDynamicData(entityName, data);
        expect(result).toEqual(validation);
        expect(result.valid).toBe(true);
      });

      it('should return validation errors', async () => {
        const entityName = 'products';
        const data = { price: 'invalid' };
        const validation = {
          valid: false,
          errors: [
            { field: 'name', message: 'Name is required' },
            { field: 'price', message: 'Price must be a number' },
          ],
        };
        
        axiosMock.mockPost(`/${entityName}/validate`, validation);

        const result = await entitiesClient.validateDynamicData(entityName, data);
        expect(result.valid).toBe(false);
        expect(result.errors).toHaveLength(2);
      });
    });
  });

  describe('Import/Export Operations', () => {
    describe('exportEntityData', () => {
      it('should export entity data as CSV', async () => {
        const entityId = 'entity-123';
        const csvBlob = new Blob(['id,name,price\n1,Product,99.99'], { type: 'text/csv' });
        const instance = axiosMock.getMockedInstance();
        
        (instance.get as jest.Mock).mockResolvedValueOnce({
          data: csvBlob,
          status: 200,
          statusText: 'OK',
          headers: { 'content-type': 'text/csv' },
          config: {},
        });

        const result = await entitiesClient.exportEntityData(entityId, 'csv');
        expect(result).toEqual(csvBlob);
      });

      it('should export entity data as JSON', async () => {
        const entityId = 'entity-123';
        const jsonData = [{ id: '1', name: 'Product', price: 99.99 }];
        
        axiosMock.mockGet(`/entities/${entityId}/export?format=json`, jsonData);

        const result = await entitiesClient.exportEntityData(entityId, 'json');
        expect(result).toEqual(jsonData);
      });
    });

    describe('importEntityData', () => {
      it('should import entity data from file', async () => {
        const entityId = 'entity-123';
        const file = new File(['test data'], 'import.csv', { type: 'text/csv' });
        const importResult = {
          imported: 10,
          failed: 2,
          errors: [
            { row: 5, error: 'Invalid data' },
            { row: 8, error: 'Duplicate key' },
          ],
        };
        
        axiosMock.mockPost(`/entities/${entityId}/import`, importResult);

        const result = await entitiesClient.importEntityData(entityId, file);
        expect(result).toEqual(importResult);
        expect(result.imported).toBe(10);
        expect(result.failed).toBe(2);
      });
    });
  });
});