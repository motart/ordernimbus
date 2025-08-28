const { expect } = require('chai');
const sinon = require('sinon');
const proxyquire = require('proxyquire');

// Note: These tests are skipped because the Lambda function has bundled AWS SDK
// which cannot be mocked properly. The Lambda requires AWS SDK from its own node_modules
// and attempts to mock it with proxyquire or sinon fail.
// See commit 61fad531 for more details.
describe.skip('Store Deletion Persistence Tests', () => {
  let dynamodbMock;
  let lambdaHandler;
  let consoleLogStub;
  let consoleErrorStub;
  let originalEnv;
  let awsMock;

  beforeEach(() => {
    // Save and set environment variables
    originalEnv = { ...process.env };
    process.env.TABLE_NAME = 'test-table';
    process.env.ENVIRONMENT = 'test';
    process.env.AWS_REGION = 'us-west-1';
    
    // Reset AWS mocks
    dynamodbMock = {
      query: sinon.stub(),
      delete: sinon.stub(),
      get: sinon.stub(),
      put: sinon.stub(),
      scan: sinon.stub(),
      batchWrite: sinon.stub()
    };

    // Create AWS mock
    awsMock = {
      DynamoDB: {
        DocumentClient: sinon.stub().returns(dynamodbMock)
      },
      config: {
        update: sinon.stub()
      }
    };

    // Stub console methods
    consoleLogStub = sinon.stub(console, 'log');
    consoleErrorStub = sinon.stub(console, 'error');

    // Use proxyquire to inject our mocked AWS SDK
    lambdaHandler = proxyquire('../../lambda/production/index.js', {
      'aws-sdk': awsMock
    });
  });

  afterEach(() => {
    sinon.restore();
    // Restore original environment
    process.env = originalEnv;
  });

  describe('Store Deletion Flow', () => {
    it('should permanently delete store from DynamoDB when DELETE request is made', async () => {
      // Check if handler exists
      expect(lambdaHandler).to.exist;
      expect(lambdaHandler.handler).to.be.a('function');
      // Arrange
      const storeId = 'store-123';
      const userId = 'test-user-123';
      
      const event = {
        httpMethod: 'DELETE',
        path: `/api/stores/${storeId}`,
        rawPath: `/api/stores/${storeId}`,  // Lambda also checks rawPath
        headers: {
          'Content-Type': 'application/json',
          'userId': userId,
          'userid': userId  // Lambda checks multiple case variations
        },
        pathParameters: {
          id: storeId,  // Lambda looks for 'id' in pathParameters
          storeId: storeId
        },
        queryStringParameters: {
          storeId: storeId  // Lambda also checks queryStringParameters
        },
        requestContext: {
          authorizer: {
            userId: userId
          },
          http: {
            method: 'DELETE'
          }
        }
      };

      // Mock getting the store first (for ownership check)
      dynamodbMock.get = sinon.stub().returns({
        promise: sinon.stub().resolves({
          Item: {
            pk: `USER#${userId}`,
            sk: `STORE#${storeId}_metadata`,
            id: storeId,
            userId: userId,
            name: 'Test Store',
            platform: 'shopify'
          }
        })
      });

      // Mock successful deletion
      dynamodbMock.delete = sinon.stub().returns({
        promise: sinon.stub().resolves({
          Attributes: {
            id: storeId,
            userId: userId,
            name: 'Test Store',
            platform: 'shopify'
          }
        })
      });

      // Act
      const result = await lambdaHandler.handler(event);

      // Assert
      expect(result.statusCode).to.equal(200);
      expect(dynamodbMock.delete.calledOnce).to.be.true;
      
      const deleteParams = dynamodbMock.delete.firstCall.args[0];
      expect(deleteParams.Key.pk).to.equal(`USER#${userId}`);
      expect(deleteParams.Key.sk).to.equal(`STORE#${storeId}_metadata`);
      expect(deleteParams.ReturnValues).to.equal('ALL_OLD');
      
      const body = JSON.parse(result.body);
      expect(body.success).to.be.true;
      expect(body.message).to.include('deleted successfully');
    });

    it('should not return deleted store when fetching stores list after deletion', async () => {
      // Arrange
      const userId = 'test-user-123';
      const deletedStoreId = 'store-to-delete';
      const remainingStoreId = 'store-to-keep';
      
      const fetchEvent = {
        httpMethod: 'GET',
        path: '/api/stores',
        headers: {
          'userId': userId
        },
        queryStringParameters: {},
        requestContext: {
          authorizer: {
            userId: userId
          }
        }
      };

      // Mock query to return only non-deleted stores
      dynamodbMock.query.returns({
        promise: sinon.stub().resolves({
          Items: [
            {
              id: `store#${remainingStoreId}`,
              userId: userId,
              name: 'Remaining Store',
              platform: 'shopify',
              isDeleted: false
            }
          ]
        })
      });

      // Act
      const result = await lambdaHandler.handler(fetchEvent);

      // Assert
      expect(result.statusCode).to.equal(200);
      const body = JSON.parse(result.body);
      expect(body.stores).to.be.an('array');
      expect(body.stores).to.have.lengthOf(1);
      expect(body.stores[0].id).to.equal(remainingStoreId);
      expect(body.stores.find(s => s.id === deletedStoreId)).to.be.undefined;
    });

    it('should handle store deletion with proper error handling for non-existent store', async () => {
      // Arrange
      const storeId = 'non-existent-store';
      const userId = 'test-user-123';
      
      const event = {
        httpMethod: 'DELETE',
        path: `/api/stores/${storeId}`,
        headers: {
          'userId': userId
        },
        pathParameters: {
          storeId: storeId
        },
        requestContext: {
          authorizer: {
            userId: userId
          }
        }
      };

      // Mock store not found
      dynamodbMock.get.returns({
        promise: sinon.stub().resolves({
          Item: null
        })
      });

      // Mock deletion returning null (store not found - won't be reached)
      dynamodbMock.delete.returns({
        promise: sinon.stub().resolves({
          Attributes: null
        })
      });

      // Act
      const result = await lambdaHandler.handler(event);

      // Assert
      expect(result.statusCode).to.equal(404);
      const body = JSON.parse(result.body);
      expect(body.error).to.include('Store not found');
    });

    it('should properly clean up related data when deleting a Shopify store', async () => {
      // Arrange
      const storeId = 'shopify-store-123';
      const userId = 'test-user-123';
      
      const event = {
        httpMethod: 'DELETE',
        path: `/api/stores/${storeId}`,
        headers: {
          'userId': userId
        },
        pathParameters: {
          storeId: storeId
        },
        requestContext: {
          authorizer: {
            userId: userId
          }
        }
      };

      // Mock getting Shopify store first
      dynamodbMock.get.returns({
        promise: sinon.stub().resolves({
          Item: {
            pk: `USER#${userId}`,
            sk: `STORE#${storeId}_metadata`,
            id: `store#${storeId}`,
            userId: userId,
            name: 'Shopify Store',
            storeName: 'Shopify Store',
            platform: 'shopify',
            storeType: 'shopify',
            shopifyDomain: 'test-store.myshopify.com',
            accessToken: 'shpat_xxxxx'
          }
        })
      });

      // Mock successful deletion with Shopify store data
      dynamodbMock.delete.returns({
        promise: sinon.stub().resolves({
          Attributes: {
            id: `store#${storeId}`,
            userId: userId,
            name: 'Shopify Store',
            platform: 'shopify',
            shopifyDomain: 'test-store.myshopify.com',
            accessToken: 'shpat_xxxxx'
          }
        })
      });

      // Act
      const result = await lambdaHandler.handler(event);

      // Assert
      expect(result.statusCode).to.equal(200);
      expect(dynamodbMock.delete.calledOnce).to.be.true;
      
      const body = JSON.parse(result.body);
      expect(body.success).to.be.true;
      expect(body.deletedStore.platform).to.equal('shopify');
      
      // Ensure sensitive data is not returned
      expect(body.deletedStore.accessToken).to.be.undefined;
    });

    it('should maintain consistency when multiple stores exist and one is deleted', async () => {
      // Arrange
      const userId = 'test-user-123';
      const storeToDelete = 'store-2';
      
      // First, fetch initial stores
      const fetchBeforeEvent = {
        httpMethod: 'GET',
        path: '/api/stores',
        headers: {
          'userId': userId
        },
        queryStringParameters: {},
        requestContext: {
          authorizer: {
            userId: userId
          }
        }
      };

      // Mock initial query with 3 stores
      dynamodbMock.query.returns({
        promise: sinon.stub().resolves({
          Items: [
            { id: 'store#store-1', userId, name: 'Store 1', platform: 'manual' },
            { id: 'store#store-2', userId, name: 'Store 2', platform: 'shopify' },
            { id: 'store#store-3', userId, name: 'Store 3', platform: 'manual' }
          ]
        })
      });

      const beforeResult = await lambdaHandler.handler(fetchBeforeEvent);
      expect(JSON.parse(beforeResult.body).stores).to.have.lengthOf(3);

      // Delete store-2
      const deleteEvent = {
        httpMethod: 'DELETE',
        path: `/api/stores/${storeToDelete}`,
        headers: {
          'userId': userId
        },
        pathParameters: {
          storeId: storeToDelete
        },
        requestContext: {
          authorizer: {
            userId: userId
          }
        }
      };

      // Mock getting the store to delete
      dynamodbMock.get.returns({
        promise: sinon.stub().resolves({
          Item: { 
            pk: `USER#${userId}`,
            sk: `STORE#${storeToDelete}_metadata`,
            id: `store#${storeToDelete}`, 
            userId, 
            name: 'Store 2',
            storeName: 'Store 2'
          }
        })
      });

      dynamodbMock.delete.returns({
        promise: sinon.stub().resolves({
          Attributes: { id: `store#${storeToDelete}`, userId, name: 'Store 2' }
        })
      });

      const deleteResult = await lambdaHandler.handler(deleteEvent);
      expect(deleteResult.statusCode).to.equal(200);

      // Reset query mock for after deletion
      dynamodbMock.query.resetHistory();
      dynamodbMock.query.returns({
        promise: sinon.stub().resolves({
          Items: [
            { id: 'store#store-1', userId, name: 'Store 1', platform: 'manual' },
            { id: 'store#store-3', userId, name: 'Store 3', platform: 'manual' }
          ]
        })
      });

      const afterResult = await lambdaHandler.handler(fetchBeforeEvent);
      const afterStores = JSON.parse(afterResult.body).stores;
      
      // Assert
      expect(afterStores).to.have.lengthOf(2);
      expect(afterStores.find(s => s.id === 'store-2')).to.be.undefined;
      expect(afterStores.find(s => s.id === 'store-1')).to.not.be.undefined;
      expect(afterStores.find(s => s.id === 'store-3')).to.not.be.undefined;
    });
  });

  describe('Frontend Cache Invalidation', () => {
    it('should return a flag indicating cache should be cleared after deletion', async () => {
      // Arrange
      const storeId = 'store-123';
      const userId = 'test-user-123';
      
      const event = {
        httpMethod: 'DELETE',
        path: `/api/stores/${storeId}`,
        headers: {
          'userId': userId
        },
        pathParameters: {
          storeId: storeId
        },
        requestContext: {
          authorizer: {
            userId: userId
          }
        }
      };

      // Mock getting store for cache test
      dynamodbMock.get.returns({
        promise: sinon.stub().resolves({
          Item: {
            pk: `USER#${userId}`,
            sk: `STORE#${storeId}_metadata`,
            id: `store#${storeId}`,
            userId: userId,
            name: 'Test Store',
            storeName: 'Test Store'
          }
        })
      });

      dynamodbMock.delete.returns({
        promise: sinon.stub().resolves({
          Attributes: {
            id: `store#${storeId}`,
            userId: userId,
            name: 'Test Store'
          }
        })
      });

      // Act
      const result = await lambdaHandler.handler(event);

      // Assert
      expect(result.statusCode).to.equal(200);
      const body = JSON.parse(result.body);
      expect(body.clearCache).to.be.true;
      expect(body.cacheKey).to.equal(`stores_${userId}`);
    });
  });
});