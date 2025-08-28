import { ColumnDefinition } from '../components/ColumnSelector';

// Order columns - matching Shopify and CSV data structure
export const ORDER_COLUMNS: ColumnDefinition[] = [
  // Essential columns
  { key: 'orderNumber', label: 'Order #', defaultVisible: true, required: true, category: 'Essential' },
  { key: 'customerName', label: 'Customer', defaultVisible: true, category: 'Essential' },
  { key: 'totalPrice', label: 'Total', defaultVisible: true, category: 'Essential' },
  { key: 'financialStatus', label: 'Payment Status', defaultVisible: true, category: 'Essential' },
  { key: 'fulfillmentStatus', label: 'Fulfillment', defaultVisible: true, category: 'Essential' },
  { key: 'orderDate', label: 'Date', defaultVisible: true, category: 'Essential' },
  
  // Customer details
  { key: 'customerEmail', label: 'Email', defaultVisible: false, category: 'Customer' },
  { key: 'phone', label: 'Phone', defaultVisible: false, category: 'Customer' },
  { key: 'customerId', label: 'Customer ID', defaultVisible: false, category: 'Customer' },
  
  // Order details  
  { key: 'orderId', label: 'Order ID', defaultVisible: false, category: 'Order Details' },
  { key: 'name', label: 'Order Name', defaultVisible: false, category: 'Order Details' },
  { key: 'itemCount', label: 'Items', defaultVisible: true, category: 'Order Details' },
  { key: 'subtotal', label: 'Subtotal', defaultVisible: false, category: 'Order Details' },
  { key: 'totalTax', label: 'Tax', defaultVisible: false, category: 'Order Details' },
  { key: 'totalShipping', label: 'Shipping', defaultVisible: false, category: 'Order Details' },
  { key: 'totalDiscount', label: 'Discount', defaultVisible: false, category: 'Order Details' },
  { key: 'currency', label: 'Currency', defaultVisible: false, category: 'Order Details' },
  { key: 'tags', label: 'Tags', defaultVisible: false, category: 'Order Details' },
  { key: 'note', label: 'Notes', defaultVisible: false, category: 'Order Details' },
  
  // Billing address
  { key: 'billing_first_name', label: 'Billing First Name', defaultVisible: false, category: 'Billing' },
  { key: 'billing_last_name', label: 'Billing Last Name', defaultVisible: false, category: 'Billing' },
  { key: 'billing_address1', label: 'Billing Address', defaultVisible: false, category: 'Billing' },
  { key: 'billing_address2', label: 'Billing Address 2', defaultVisible: false, category: 'Billing' },
  { key: 'billing_city', label: 'Billing City', defaultVisible: false, category: 'Billing' },
  { key: 'billing_province', label: 'Billing State/Province', defaultVisible: false, category: 'Billing' },
  { key: 'billing_zip', label: 'Billing Zip', defaultVisible: false, category: 'Billing' },
  { key: 'billing_country', label: 'Billing Country', defaultVisible: false, category: 'Billing' },
  
  // Shipping address
  { key: 'shipping_first_name', label: 'Shipping First Name', defaultVisible: false, category: 'Shipping' },
  { key: 'shipping_last_name', label: 'Shipping Last Name', defaultVisible: false, category: 'Shipping' },
  { key: 'shipping_address1', label: 'Shipping Address', defaultVisible: false, category: 'Shipping' },
  { key: 'shipping_address2', label: 'Shipping Address 2', defaultVisible: false, category: 'Shipping' },
  { key: 'shipping_city', label: 'Shipping City', defaultVisible: false, category: 'Shipping' },
  { key: 'shipping_province', label: 'Shipping State/Province', defaultVisible: false, category: 'Shipping' },
  { key: 'shipping_zip', label: 'Shipping Zip', defaultVisible: false, category: 'Shipping' },
  { key: 'shipping_country', label: 'Shipping Country', defaultVisible: false, category: 'Shipping' },
  { key: 'shippingMethod', label: 'Shipping Method', defaultVisible: false, category: 'Shipping' },
  
  // Line items (if showing as summary)
  { key: 'lineitem_name', label: 'Products', defaultVisible: false, category: 'Line Items' },
  { key: 'lineitem_quantity', label: 'Quantities', defaultVisible: false, category: 'Line Items' },
  { key: 'lineitem_price', label: 'Item Prices', defaultVisible: false, category: 'Line Items' },
  { key: 'lineitem_sku', label: 'SKUs', defaultVisible: false, category: 'Line Items' },
  
  // Timestamps
  { key: 'createdAt', label: 'Created At', defaultVisible: false, category: 'Timestamps' },
  { key: 'updatedAt', label: 'Updated At', defaultVisible: false, category: 'Timestamps' },
  { key: 'syncedAt', label: 'Last Synced', defaultVisible: false, category: 'Timestamps' },
  
  // Store info
  { key: 'storeId', label: 'Store ID', defaultVisible: false, category: 'System' },
  { key: 'storeDomain', label: 'Store Domain', defaultVisible: false, category: 'System' },
];

// Product columns - matching Shopify and CSV data structure
export const PRODUCT_COLUMNS: ColumnDefinition[] = [
  // Essential columns
  { key: 'title', label: 'Product Name', defaultVisible: true, required: true, category: 'Essential' },
  { key: 'sku', label: 'SKU', defaultVisible: true, category: 'Essential' },
  { key: 'price', label: 'Price', defaultVisible: true, category: 'Essential' },
  { key: 'inventory', label: 'Stock', defaultVisible: true, category: 'Essential' },
  { key: 'vendor', label: 'Vendor', defaultVisible: true, category: 'Essential' },
  
  // Product details
  { key: 'productId', label: 'Product ID', defaultVisible: false, category: 'Product Details' },
  { key: 'variantId', label: 'Variant ID', defaultVisible: false, category: 'Product Details' },
  { key: 'variantTitle', label: 'Variant', defaultVisible: false, category: 'Product Details' },
  { key: 'name', label: 'Internal Name', defaultVisible: false, category: 'Product Details' },
  { key: 'product_type', label: 'Type/Category', defaultVisible: true, category: 'Product Details' },
  { key: 'description', label: 'Description', defaultVisible: false, category: 'Product Details' },
  { key: 'tags', label: 'Tags', defaultVisible: false, category: 'Product Details' },
  { key: 'barcode', label: 'Barcode', defaultVisible: false, category: 'Product Details' },
  
  // Pricing
  { key: 'compare_at_price', label: 'Compare Price', defaultVisible: false, category: 'Pricing' },
  { key: 'cost', label: 'Cost', defaultVisible: false, category: 'Pricing' },
  { key: 'margin', label: 'Margin', defaultVisible: false, category: 'Pricing' },
  
  // Physical properties
  { key: 'weight', label: 'Weight', defaultVisible: false, category: 'Physical' },
  { key: 'weight_unit', label: 'Weight Unit', defaultVisible: false, category: 'Physical' },
  { key: 'dimensions', label: 'Dimensions', defaultVisible: false, category: 'Physical' },
  
  // Inventory details
  { key: 'inventory_quantity', label: 'Quantity', defaultVisible: false, category: 'Inventory' },
  { key: 'inventory_policy', label: 'Inventory Policy', defaultVisible: false, category: 'Inventory' },
  { key: 'inventory_management', label: 'Tracking', defaultVisible: false, category: 'Inventory' },
  { key: 'requires_shipping', label: 'Requires Shipping', defaultVisible: false, category: 'Inventory' },
  { key: 'taxable', label: 'Taxable', defaultVisible: false, category: 'Inventory' },
  
  // Images
  { key: 'image', label: 'Image', defaultVisible: false, category: 'Media' },
  { key: 'images', label: 'All Images', defaultVisible: false, category: 'Media' },
  
  // Timestamps
  { key: 'createdAt', label: 'Created', defaultVisible: false, category: 'Timestamps' },
  { key: 'updatedAt', label: 'Updated', defaultVisible: false, category: 'Timestamps' },
  { key: 'publishedAt', label: 'Published', defaultVisible: false, category: 'Timestamps' },
  { key: 'syncedAt', label: 'Last Synced', defaultVisible: false, category: 'Timestamps' },
  
  // SEO
  { key: 'handle', label: 'URL Handle', defaultVisible: false, category: 'SEO' },
  { key: 'seo_title', label: 'SEO Title', defaultVisible: false, category: 'SEO' },
  { key: 'seo_description', label: 'SEO Description', defaultVisible: false, category: 'SEO' },
  
  // Store info
  { key: 'storeId', label: 'Store ID', defaultVisible: false, category: 'System' },
  { key: 'storeDomain', label: 'Store Domain', defaultVisible: false, category: 'System' },
];

// Customer columns - matching Shopify and CSV data structure
export const CUSTOMER_COLUMNS: ColumnDefinition[] = [
  // Essential columns
  { key: 'fullName', label: 'Name', defaultVisible: true, required: true, category: 'Essential' },
  { key: 'email', label: 'Email', defaultVisible: true, category: 'Essential' },
  { key: 'phone', label: 'Phone', defaultVisible: true, category: 'Essential' },
  { key: 'total_orders', label: 'Orders', defaultVisible: true, category: 'Essential' },
  { key: 'total_spent', label: 'Total Spent', defaultVisible: true, category: 'Essential' },
  
  // Name details
  { key: 'firstName', label: 'First Name', defaultVisible: false, category: 'Personal' },
  { key: 'lastName', label: 'Last Name', defaultVisible: false, category: 'Personal' },
  { key: 'company', label: 'Company', defaultVisible: false, category: 'Personal' },
  { key: 'customerId', label: 'Customer ID', defaultVisible: false, category: 'Personal' },
  
  // Address
  { key: 'address', label: 'Address', defaultVisible: false, category: 'Address' },
  { key: 'address1', label: 'Address Line 1', defaultVisible: false, category: 'Address' },
  { key: 'address2', label: 'Address Line 2', defaultVisible: false, category: 'Address' },
  { key: 'city', label: 'City', defaultVisible: false, category: 'Address' },
  { key: 'state', label: 'State/Province', defaultVisible: false, category: 'Address' },
  { key: 'province', label: 'Province', defaultVisible: false, category: 'Address' },
  { key: 'zip', label: 'Zip/Postal', defaultVisible: false, category: 'Address' },
  { key: 'country', label: 'Country', defaultVisible: false, category: 'Address' },
  { key: 'country_code', label: 'Country Code', defaultVisible: false, category: 'Address' },
  
  // Marketing
  { key: 'accepts_marketing', label: 'Accepts Marketing', defaultVisible: false, category: 'Marketing' },
  { key: 'marketing_opt_in_level', label: 'Marketing Level', defaultVisible: false, category: 'Marketing' },
  { key: 'tags', label: 'Tags', defaultVisible: false, category: 'Marketing' },
  { key: 'note', label: 'Notes', defaultVisible: false, category: 'Marketing' },
  
  // Account
  { key: 'verified_email', label: 'Email Verified', defaultVisible: false, category: 'Account' },
  { key: 'tax_exempt', label: 'Tax Exempt', defaultVisible: false, category: 'Account' },
  { key: 'account_activation_email', label: 'Activation Email', defaultVisible: false, category: 'Account' },
  
  // Stats
  { key: 'orders_count', label: 'Order Count', defaultVisible: false, category: 'Statistics' },
  { key: 'average_order_value', label: 'Avg Order Value', defaultVisible: false, category: 'Statistics' },
  { key: 'last_order_date', label: 'Last Order', defaultVisible: false, category: 'Statistics' },
  { key: 'first_order_date', label: 'First Order', defaultVisible: false, category: 'Statistics' },
  
  // Timestamps
  { key: 'createdAt', label: 'Created', defaultVisible: false, category: 'Timestamps' },
  { key: 'updatedAt', label: 'Updated', defaultVisible: false, category: 'Timestamps' },
  { key: 'syncedAt', label: 'Last Synced', defaultVisible: false, category: 'Timestamps' },
  
  // Store info
  { key: 'storeId', label: 'Store ID', defaultVisible: false, category: 'System' },
  { key: 'storeDomain', label: 'Store Domain', defaultVisible: false, category: 'System' },
];

// Inventory columns - matching Shopify and CSV data structure  
export const INVENTORY_COLUMNS: ColumnDefinition[] = [
  // Essential columns
  { key: 'sku', label: 'SKU', defaultVisible: true, required: true, category: 'Essential' },
  { key: 'productName', label: 'Product', defaultVisible: true, category: 'Essential' },
  { key: 'available', label: 'Available', defaultVisible: true, category: 'Essential' },
  { key: 'quantity', label: 'Total Quantity', defaultVisible: true, category: 'Essential' },
  { key: 'location', label: 'Location', defaultVisible: true, category: 'Essential' },
  
  // Stock levels
  { key: 'inventoryId', label: 'Inventory ID', defaultVisible: false, category: 'Stock' },
  { key: 'committed', label: 'Committed', defaultVisible: false, category: 'Stock' },
  { key: 'incoming', label: 'Incoming', defaultVisible: false, category: 'Stock' },
  { key: 'reserved', label: 'Reserved', defaultVisible: false, category: 'Stock' },
  { key: 'on_hand', label: 'On Hand', defaultVisible: false, category: 'Stock' },
  { key: 'safety_stock', label: 'Safety Stock', defaultVisible: false, category: 'Stock' },
  { key: 'reorder_point', label: 'Reorder Point', defaultVisible: false, category: 'Stock' },
  { key: 'reorder_quantity', label: 'Reorder Qty', defaultVisible: false, category: 'Stock' },
  
  // Location details
  { key: 'locationId', label: 'Location ID', defaultVisible: false, category: 'Location' },
  { key: 'location_name', label: 'Location Name', defaultVisible: false, category: 'Location' },
  { key: 'warehouse', label: 'Warehouse', defaultVisible: false, category: 'Location' },
  { key: 'bin', label: 'Bin', defaultVisible: false, category: 'Location' },
  { key: 'aisle', label: 'Aisle', defaultVisible: false, category: 'Location' },
  { key: 'shelf', label: 'Shelf', defaultVisible: false, category: 'Location' },
  
  // Product info
  { key: 'productId', label: 'Product ID', defaultVisible: false, category: 'Product' },
  { key: 'variantId', label: 'Variant ID', defaultVisible: false, category: 'Product' },
  { key: 'variantTitle', label: 'Variant', defaultVisible: false, category: 'Product' },
  { key: 'vendor', label: 'Vendor', defaultVisible: false, category: 'Product' },
  { key: 'product_type', label: 'Type', defaultVisible: false, category: 'Product' },
  
  // Cost and value
  { key: 'cost', label: 'Unit Cost', defaultVisible: false, category: 'Financial' },
  { key: 'total_value', label: 'Total Value', defaultVisible: false, category: 'Financial' },
  { key: 'average_cost', label: 'Avg Cost', defaultVisible: false, category: 'Financial' },
  
  // Movement
  { key: 'last_sold', label: 'Last Sold', defaultVisible: false, category: 'Movement' },
  { key: 'last_received', label: 'Last Received', defaultVisible: false, category: 'Movement' },
  { key: 'velocity', label: 'Velocity', defaultVisible: false, category: 'Movement' },
  { key: 'days_of_inventory', label: 'Days of Inventory', defaultVisible: false, category: 'Movement' },
  
  // Timestamps
  { key: 'updatedAt', label: 'Updated', defaultVisible: false, category: 'Timestamps' },
  { key: 'counted_at', label: 'Last Count', defaultVisible: false, category: 'Timestamps' },
  { key: 'syncedAt', label: 'Last Synced', defaultVisible: false, category: 'Timestamps' },
  
  // Store info
  { key: 'storeId', label: 'Store ID', defaultVisible: false, category: 'System' },
  { key: 'storeDomain', label: 'Store Domain', defaultVisible: false, category: 'System' },
];