const { expect } = require('chai');
const sinon = require('sinon');
const AWS = require('aws-sdk-mock');

describe('Store Fetching Tests', () => {
  let handler;
  let dynamodbMock;

  beforeEach(() => {
    // Set up environment variables
    process.env.TABLE_NAME = 'test-table';
    process.env.AWS_REGION = 'us-west-1';
    process.env.NODE_ENV = 'test';

    // Mock AWS SDK BEFORE requiring the handler
    AWS.mock('DynamoDB.DocumentClient', 'query', (params, callback) => {
      // Return a store with the new format sk: STORE#storeId_metadata
      if (params.ExpressionAttributeValues[':skPrefix'] === 'STORE#') {
        callback(null, {
          Items: [{
            pk: 'USER#test-user-123',
            sk: 'STORE#shopify_1756328647971_vfgenaydy_metadata',
            storeId: 'shopify_1756328647971_vfgenaydy',
            storeName: 'Test Shopify Store',
            name: 'Test Shopify Store',
            displayName: 'Test Shopify Store',
            storeType: 'shopify',
            type: 'shopify',
            shopifyDomain: 'test-store-1756328647.myshopify.com',
            status: 'active',
            createdAt: '2025-08-27T21:04:07.971Z'
          }]
        });
      } else {
        callback(null, { Items: [] });
      }
    });

    AWS.mock('SecretsManager', 'getSecretValue', (params, callback) => {
      callback(null, { 
        SecretString: JSON.stringify({ 
          SHOPIFY_CLIENT_ID: 'test-client-id',
          SHOPIFY_CLIENT_SECRET: 'test-secret'
        })
      });
    });

    // Clear require cache and re-require handler AFTER mocks are set
    delete require.cache[require.resolve('../../lambda/production/index.js')];
    handler = require('../../lambda/production/index.js');
  });

  afterEach(() => {
    AWS.restore();
    sinon.restore();
  });

  it('should correctly parse and return stores with new sk format', async () => {
    const event = {
      rawPath: '/production/api/stores',
      headers: {
        userid: 'test-user-123'
      },
      requestContext: {
        http: { method: 'GET' }
      }
    };

    const result = await handler.handler(event);
    const body = JSON.parse(result.body);

    expect(result.statusCode).to.equal(200);
    expect(body.stores).to.be.an('array');
    expect(body.stores).to.have.length(1);
    
    const store = body.stores[0];
    expect(store.id).to.equal('shopify_1756328647971_vfgenaydy');
    expect(store.name).to.equal('Test Shopify Store');
    expect(store.shopifyDomain).to.equal('test-store-1756328647.myshopify.com');
    expect(store.type).to.equal('shopify');
  });

  it('should handle stores with underscore in storeId correctly', async () => {
    AWS.restore('DynamoDB.DocumentClient');
    AWS.mock('DynamoDB.DocumentClient', 'query', (params, callback) => {
      if (params.ExpressionAttributeValues[':skPrefix'] === 'STORE#') {
        callback(null, {
          Items: [{
            pk: 'USER#test-user-123',
            sk: 'STORE#manual_store_123_abc_metadata',
            storeId: 'manual_store_123_abc',
            storeName: 'Manual Store',
            shopifyDomain: '',
            type: 'brick-and-mortar'
          }]
        });
      } else {
        callback(null, { Items: [] });
      }
    });

    const event = {
      rawPath: '/production/api/stores',
      headers: {
        userid: 'test-user-123'
      },
      requestContext: {
        http: { method: 'GET' }
      }
    };

    const result = await handler.handler(event);
    const body = JSON.parse(result.body);

    expect(result.statusCode).to.equal(200);
    expect(body.stores[0].id).to.equal('manual_store_123_abc');
    expect(body.stores[0].name).to.equal('Manual Store');
  });
});