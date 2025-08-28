#!/usr/bin/env node

/**
 * Script to delete ALL stores and related data from DynamoDB
 * This will give us a clean slate to work with only the new format
 */

const AWS = require('aws-sdk');

// Configure AWS
AWS.config.update({ region: 'us-west-1' });
const dynamodb = new AWS.DynamoDB.DocumentClient();

const TABLE_NAME = 'ordernimbus-production-main';

async function deleteAllStores() {
  console.log('🗑️  Deleting ALL stores and related data...\n');
  
  // Find all items that look like stores or store-related data
  console.log('Finding all store-related items...');
  const itemsToDelete = [];
  let lastEvaluatedKey = null;
  
  do {
    const params = {
      TableName: TABLE_NAME,
      FilterExpression: 'contains(sk, :store) OR contains(sk, :storeUpper) OR contains(pk, :user)',
      ExpressionAttributeValues: {
        ':store': 'store',
        ':storeUpper': 'STORE',
        ':user': 'USER#'
      }
    };
    
    if (lastEvaluatedKey) {
      params.ExclusiveStartKey = lastEvaluatedKey;
    }
    
    const result = await dynamodb.scan(params).promise();
    itemsToDelete.push(...(result.Items || []));
    lastEvaluatedKey = result.LastEvaluatedKey;
  } while (lastEvaluatedKey);
  
  console.log(`Found ${itemsToDelete.length} items to delete\n`);
  
  if (itemsToDelete.length === 0) {
    console.log('No items found. Database is already clean!');
    return;
  }
  
  // Delete in batches
  const batchSize = 25; // DynamoDB limit
  console.log('Deleting items...');
  
  for (let i = 0; i < itemsToDelete.length; i += batchSize) {
    const batch = itemsToDelete.slice(i, i + batchSize);
    const deleteRequests = batch.map(item => ({
      DeleteRequest: {
        Key: {
          pk: item.pk,
          sk: item.sk
        }
      }
    }));
    
    await dynamodb.batchWrite({
      RequestItems: {
        [TABLE_NAME]: deleteRequests
      }
    }).promise();
    
    console.log(`  Deleted ${Math.min(i + batchSize, itemsToDelete.length)}/${itemsToDelete.length}`);
  }
  
  console.log('\n✅ All store-related data has been deleted!');
  console.log('The database is now clean and ready for fresh data using only the new format.');
}

// Run deletion
deleteAllStores().catch(err => {
  console.error('Deletion failed:', err);
  process.exit(1);
});