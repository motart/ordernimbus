#!/usr/bin/env node

/**
 * Migration script to convert old DynamoDB format to new scalable format
 * Old format: pk: user_<userId>, sk: store_<storeId>_metadata
 * New format: pk: USER#<userId>, sk: STORE#<storeId>_metadata
 */

const AWS = require('aws-sdk');

// Configure AWS
AWS.config.update({ region: 'us-west-1' });
const dynamodb = new AWS.DynamoDB.DocumentClient();

const TABLE_NAME = 'ordernimbus-production-main';

async function migrateStores() {
  console.log('Starting migration to new format...\n');
  
  // Step 1: Scan for all old format items
  console.log('Step 1: Finding old format items...');
  const oldFormatItems = [];
  let lastEvaluatedKey = null;
  
  do {
    const params = {
      TableName: TABLE_NAME,
      FilterExpression: 'begins_with(pk, :oldPrefix)',
      ExpressionAttributeValues: {
        ':oldPrefix': 'user_'
      }
    };
    
    if (lastEvaluatedKey) {
      params.ExclusiveStartKey = lastEvaluatedKey;
    }
    
    const result = await dynamodb.scan(params).promise();
    oldFormatItems.push(...(result.Items || []));
    lastEvaluatedKey = result.LastEvaluatedKey;
  } while (lastEvaluatedKey);
  
  console.log(`Found ${oldFormatItems.length} old format items\n`);
  
  if (oldFormatItems.length === 0) {
    console.log('No old format items found. Migration complete!');
    return;
  }
  
  // Step 2: Group items by user and type
  const userItems = {};
  oldFormatItems.forEach(item => {
    const userId = item.pk.replace('user_', '');
    if (!userItems[userId]) {
      userItems[userId] = [];
    }
    userItems[userId].push(item);
  });
  
  console.log(`Found ${Object.keys(userItems).length} users to migrate\n`);
  
  // Step 3: Migrate each user's data
  for (const [userId, items] of Object.entries(userItems)) {
    console.log(`\nMigrating user: ${userId}`);
    console.log(`  Items to migrate: ${items.length}`);
    
    const newItems = [];
    const deleteRequests = [];
    
    for (const item of items) {
      // Create new format item
      const newItem = { ...item };
      
      // Convert pk
      newItem.pk = `USER#${userId}`;
      
      // Convert sk based on type
      if (item.sk.startsWith('store_')) {
        // Store metadata: store_<storeId>_metadata -> STORE#<storeId>_metadata
        const storeId = item.sk.replace('store_', '').replace('_metadata', '');
        newItem.sk = `STORE#${storeId}_metadata`;
        
        // Ensure storeId field exists
        if (!newItem.storeId) {
          newItem.storeId = storeId;
        }
        
        // Ensure essential fields exist
        if (!newItem.storeName && !newItem.name) {
          newItem.storeName = 'Migrated Store';
          newItem.name = 'Migrated Store';
        }
        
        console.log(`  Migrating store: ${storeId}`);
      } else if (item.sk.startsWith('order_')) {
        // Order: order_<orderId> -> ORDER#<storeId>#<orderId>
        const orderId = item.sk.replace('order_', '');
        const storeId = item.storeId || 'unknown';
        newItem.sk = `ORDER#${storeId}#${orderId}`;
        console.log(`  Migrating order: ${orderId}`);
      } else if (item.sk.startsWith('product_')) {
        // Product: product_<productId> -> PRODUCT#<storeId>#<productId>
        const productId = item.sk.replace('product_', '');
        const storeId = item.storeId || 'unknown';
        newItem.sk = `PRODUCT#${storeId}#${productId}`;
        console.log(`  Migrating product: ${productId}`);
      } else {
        // Unknown type, migrate as-is but with new pk
        console.log(`  Migrating unknown type: ${item.sk}`);
      }
      
      newItems.push(newItem);
      
      // Prepare delete request for old item
      deleteRequests.push({
        DeleteRequest: {
          Key: {
            pk: item.pk,
            sk: item.sk
          }
        }
      });
    }
    
    // Step 4: Write new items in batches
    console.log(`  Writing ${newItems.length} new format items...`);
    const batchSize = 25; // DynamoDB limit
    
    for (let i = 0; i < newItems.length; i += batchSize) {
      const batch = newItems.slice(i, i + batchSize);
      const putRequests = batch.map(item => ({
        PutRequest: { Item: item }
      }));
      
      await dynamodb.batchWrite({
        RequestItems: {
          [TABLE_NAME]: putRequests
        }
      }).promise();
      
      console.log(`    Written ${Math.min(i + batchSize, newItems.length)}/${newItems.length}`);
    }
    
    // Step 5: Delete old items in batches
    console.log(`  Deleting ${deleteRequests.length} old format items...`);
    
    for (let i = 0; i < deleteRequests.length; i += batchSize) {
      const batch = deleteRequests.slice(i, i + batchSize);
      
      await dynamodb.batchWrite({
        RequestItems: {
          [TABLE_NAME]: batch
        }
      }).promise();
      
      console.log(`    Deleted ${Math.min(i + batchSize, deleteRequests.length)}/${deleteRequests.length}`);
    }
    
    console.log(`  ✓ User ${userId} migrated successfully`);
  }
  
  console.log('\n✅ Migration completed successfully!');
  
  // Step 6: Verify migration
  console.log('\nVerifying migration...');
  const verifyParams = {
    TableName: TABLE_NAME,
    FilterExpression: 'begins_with(pk, :oldPrefix)',
    ExpressionAttributeValues: {
      ':oldPrefix': 'user_'
    },
    Limit: 1
  };
  
  const verifyResult = await dynamodb.scan(verifyParams).promise();
  if (verifyResult.Items && verifyResult.Items.length > 0) {
    console.log('⚠️  Warning: Some old format items still exist');
  } else {
    console.log('✅ All old format items have been migrated');
  }
}

// Run migration
migrateStores().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});