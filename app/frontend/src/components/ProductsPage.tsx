import React, { useState, useEffect } from 'react';
import './ProductsPage.css';
import toast from 'react-hot-toast';
import { ClipLoader } from 'react-spinners';
import { FiRefreshCw, FiSearch, FiFilter, FiPackage, FiPlus, FiTag, FiDollarSign } from 'react-icons/fi';
import ManualEntryModal from './ManualEntryModal';
import './ManualEntryModal.css';
import { useAuth } from '../contexts/AuthContext';
import { createAuthenticatedFetch } from '../utils/authenticatedFetch';
import ColumnSelector from './ColumnSelector';
import { useColumnVisibility } from '../hooks/useColumnVisibility';
import { PRODUCT_COLUMNS } from '../config/columnDefinitions';

interface Product {
  id: string;
  productId?: string;
  storeId: string;
  title: string;
  description?: string;
  vendor?: string;
  product_type?: string;
  price: string;
  sku?: string;
  barcode?: string;
  inventory?: number; // For display
  inventory_quantity?: number;
  inventory_policy?: string;
  inventory_management?: string;
  weight?: number;
  weight_unit?: string;
  compare_at_price?: string;
  cost?: string;
  margin?: string;
  tags?: string;
  handle?: string;
  seo_title?: string;
  seo_description?: string;
  image?: string;
  images?: string;
  variantId?: string;
  variantTitle?: string;
  name?: string;
  dimensions?: string;
  requires_shipping?: boolean;
  taxable?: boolean;
  createdAt?: string;
  created_at?: string;
  updatedAt?: string;
  updated_at?: string;
  publishedAt?: string;
  syncedAt?: string;
  storeDomain?: string;
}

interface Store {
  id: string;
  name?: string;
  displayName?: string;
  type?: string;
  shopifyDomain?: string;
  syncStatus?: string;
}

const ProductsPage: React.FC = () => {
  const { getAccessToken } = useAuth();
  const authenticatedFetch = createAuthenticatedFetch({ getAccessToken });
  const [products, setProducts] = useState<Product[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStore, setSelectedStore] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [vendorFilter, setVendorFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showManualEntry, setShowManualEntry] = useState(false);

  // Use column visibility hook
  const {
    visibleColumns,
    toggleColumn,
    resetColumns,
    getVisibleColumnDefinitions,
    isLoading: columnsLoading
  } = useColumnVisibility({
    columns: PRODUCT_COLUMNS,
    storageKey: 'products-table',
    defaultVisible: PRODUCT_COLUMNS
      .filter(col => col.defaultVisible !== false || col.required)
      .map(col => col.key)
  });

  useEffect(() => {
    loadStores();
  }, []);

  useEffect(() => {
    if (selectedStore) {
      loadProducts();
    }
  }, [selectedStore]);

  const loadStores = async () => {
    try {
      const response = await authenticatedFetch(`/api/stores`);

      if (response.ok) {
        const data = await response.json();
        setStores(data.stores || []);
        
        // Auto-select first store
        if (data.stores && data.stores.length > 0 && !selectedStore) {
          setSelectedStore(data.stores[0].id);
        }
      } else {
        toast.error('Failed to load stores');
      }
    } catch (error) {
      // TODO: Log error to monitoring service
      toast.error('Error loading stores');
    }
  };

  const loadProducts = async () => {
    if (!selectedStore) return;
    
    setIsLoading(true);
    try {
      const response = await authenticatedFetch(`/api/products?storeId=${selectedStore}`);

      if (response.ok) {
        const data = await response.json();
        // Normalize data to include both old and new field names
        const normalizedProducts = (data.products || []).map((product: any) => ({
          ...product,
          // Ensure we have inventory for display
          inventory: product.inventory || product.inventory_quantity || 0,
          // Ensure we have proper date fields
          createdAt: product.createdAt || product.created_at,
          updatedAt: product.updatedAt || product.updated_at
        }));
        setProducts(normalizedProducts);
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Failed to load products');
        setProducts([]);
      }
    } catch (error) {
      // TODO: Log error to monitoring service
      toast.error('Error loading products');
      setProducts([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadProducts();
    setIsRefreshing(false);
    toast.success('Products refreshed');
  };

  const handleManualEntry = async (productData: any) => {
    try {
      const response = await authenticatedFetch(`/api/products`, {
        method: 'POST',
        body: JSON.stringify({
          storeId: productData.storeId,
          product: {
            ...productData,
            id: `manual-${Date.now()}`,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            price: parseFloat(productData.price) || 0,
            compare_at_price: productData.compare_at_price ? parseFloat(productData.compare_at_price) : null,
            inventory_quantity: parseInt(productData.inventory_quantity) || 0,
            weight: parseInt(productData.weight) || 0
          }
        })
      });

      if (response.ok) {
        toast.success('Product created successfully');
        await loadProducts();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create product');
      }
    } catch (error) {
      // TODO: Log error to monitoring service
      toast.error(`Failed to create product: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  };

  const formatCurrency = (amount: string | number | undefined) => {
    const num = parseFloat(amount?.toString() || '0');
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(num);
  };

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return '--';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatBoolean = (value: boolean | undefined) => {
    if (value === undefined) return '--';
    return value ? 'Yes' : 'No';
  };

  // Get unique product types and vendors for filters
  const productTypes = Array.from(new Set(products.map(p => p.product_type).filter(Boolean)));
  const vendors = Array.from(new Set(products.map(p => p.vendor).filter(Boolean)));

  const filteredProducts = products.filter(product => {
    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = 
        product.title?.toLowerCase().includes(searchLower) ||
        product.vendor?.toLowerCase().includes(searchLower) ||
        product.product_type?.toLowerCase().includes(searchLower) ||
        product.sku?.toLowerCase().includes(searchLower) ||
        product.tags?.toLowerCase().includes(searchLower);
      
      if (!matchesSearch) return false;
    }

    // Type filter
    if (typeFilter !== 'all' && product.product_type !== typeFilter) {
      return false;
    }

    // Vendor filter
    if (vendorFilter !== 'all' && product.vendor !== vendorFilter) {
      return false;
    }

    return true;
  });

  const selectedStoreObj = stores.find(s => s.id === selectedStore);
  const selectedStoreName = selectedStoreObj ? 
    (selectedStoreObj.displayName || selectedStoreObj.name || selectedStoreObj.shopifyDomain || selectedStoreObj.id) : 
    'Unknown Store';

  // Get visible column definitions
  const visibleColumnDefs = getVisibleColumnDefinitions();

  // Helper function to get cell value based on column key
  const getCellValue = (product: Product, columnKey: string) => {
    switch (columnKey) {
      case 'title':
        return (
          <div className="product-info">
            <div className="product-title">{product.title}</div>
            {product.sku && visibleColumns.includes('sku') && (
              <div className="product-sku">SKU: {product.sku}</div>
            )}
            {product.tags && visibleColumns.includes('tags') && (
              <div className="product-tags">
                {React.createElement(FiTag as any, { size: 12 })}
                {product.tags}
              </div>
            )}
          </div>
        );
      
      case 'sku':
        return product.sku || '--';
      
      case 'price':
        return (
          <div className="price-info">
            <div className="current-price">{formatCurrency(product.price)}</div>
            {product.compare_at_price && parseFloat(product.compare_at_price) > parseFloat(product.price) && (
              <div className="compare-price">{formatCurrency(product.compare_at_price)}</div>
            )}
          </div>
        );
      
      case 'inventory':
        const qty = product.inventory || product.inventory_quantity || 0;
        return (
          <span className={`inventory-badge ${qty > 0 ? 'in-stock' : 'out-of-stock'}`}>
            {qty}
          </span>
        );
      
      case 'vendor':
        return product.vendor || '--';
      
      case 'product_type':
        return product.product_type || '--';
      
      case 'description':
        return product.description ? (
          <div className="description-cell" title={product.description}>
            {product.description.substring(0, 100)}
            {product.description.length > 100 && '...'}
          </div>
        ) : '--';
      
      case 'productId':
        return product.productId || product.id || '--';
      
      case 'variantId':
        return product.variantId || '--';
      
      case 'variantTitle':
        return product.variantTitle || '--';
      
      case 'name':
        return product.name || '--';
      
      case 'tags':
        return product.tags || '--';
      
      case 'barcode':
        return product.barcode || '--';
      
      case 'compare_at_price':
        return formatCurrency(product.compare_at_price);
      
      case 'cost':
        return formatCurrency(product.cost);
      
      case 'margin':
        return product.margin || '--';
      
      case 'weight':
        return product.weight ? `${product.weight} ${product.weight_unit || 'kg'}` : '--';
      
      case 'weight_unit':
        return product.weight_unit || '--';
      
      case 'dimensions':
        return product.dimensions || '--';
      
      case 'inventory_quantity':
        return product.inventory_quantity || 0;
      
      case 'inventory_policy':
        return product.inventory_policy || '--';
      
      case 'inventory_management':
        return product.inventory_management || '--';
      
      case 'requires_shipping':
        return formatBoolean(product.requires_shipping);
      
      case 'taxable':
        return formatBoolean(product.taxable);
      
      case 'image':
        return product.image ? <img src={product.image} alt={product.title} style={{ width: 50, height: 50 }} /> : '--';
      
      case 'images':
        return product.images || '--';
      
      case 'createdAt':
        return formatDate(product.createdAt || product.created_at);
      
      case 'updatedAt':
        return formatDate(product.updatedAt || product.updated_at);
      
      case 'publishedAt':
        return formatDate(product.publishedAt);
      
      case 'syncedAt':
        return formatDate(product.syncedAt);
      
      case 'handle':
        return product.handle || '--';
      
      case 'seo_title':
        return product.seo_title || '--';
      
      case 'seo_description':
        return product.seo_description || '--';
      
      case 'storeId':
        return product.storeId || '--';
      
      case 'storeDomain':
        return product.storeDomain || selectedStoreObj?.shopifyDomain || '--';
      
      default:
        return '--';
    }
  };

  return (
    <div className="order-page">
      <header className="order-header">
        <div className="header-content">
          <div className="header-actions">
            {selectedStore && (
              <button 
                onClick={() => setShowManualEntry(true)}
                className="csv-upload-btn"
              >
                {React.createElement(FiPlus as any)}
                Add Product
              </button>
            )}
            <ColumnSelector
              columns={PRODUCT_COLUMNS}
              visibleColumns={visibleColumns}
              onColumnToggle={toggleColumn}
              onReset={resetColumns}
              storageKey="products-table"
            />
            <button 
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="refresh-btn"
            >
              {React.createElement(FiRefreshCw as any, { className: isRefreshing ? 'spinning' : '' })}
              {isRefreshing ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>
      </header>

      <div className="order-controls">
        <div className="controls-row">
          <div className="store-selector-container">
            <label>Store:</label>
            <select 
              value={selectedStore} 
              onChange={(e) => setSelectedStore(e.target.value)}
              className="store-selector"
            >
              <option value="">Select a store</option>
              {stores.map(store => {
                const storeName = store.displayName || store.name || store.shopifyDomain || store.id;
                const storeType = store.type || 'shopify';
                return (
                  <option key={store.id} value={store.id}>
                    {storeName} ({storeType})
                  </option>
                );
              })}
            </select>
          </div>

          <div className="search-container">
            {React.createElement(FiSearch as any, { className: 'search-icon' })}
            <input
              type="text"
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>

          <div className="filter-container">
            {React.createElement(FiFilter as any, { className: 'filter-icon' })}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="filter-select"
            >
              <option value="all">All Types</option>
              {productTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          <div className="filter-container">
            <select
              value={vendorFilter}
              onChange={(e) => setVendorFilter(e.target.value)}
              className="filter-select"
            >
              <option value="all">All Vendors</option>
              {vendors.map(vendor => (
                <option key={vendor} value={vendor}>{vendor}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      {selectedStore && !isLoading && products.length > 0 && (
        <div className="order-summary">
          <div className="summary-card">
            <div className="summary-value">{filteredProducts.length}</div>
            <div className="summary-label">Total Products</div>
          </div>
          <div className="summary-card low-stock">
            <div className="summary-value">
              {filteredProducts.filter(p => {
                const qty = p.inventory || p.inventory_quantity || 0;
                return qty < 10 && qty > 0;
              }).length}
            </div>
            <div className="summary-label">Low Stock</div>
          </div>
          <div className="summary-card out-of-stock">
            <div className="summary-value">
              {filteredProducts.filter(p => (p.inventory || p.inventory_quantity || 0) === 0).length}
            </div>
            <div className="summary-label">Out of Stock</div>
          </div>
          <div className="summary-card revenue">
            <div className="summary-value">
              {formatCurrency(
                filteredProducts.reduce((sum, p) => {
                  const price = parseFloat(p.price) || 0;
                  const qty = p.inventory || p.inventory_quantity || 0;
                  return sum + (price * qty);
                }, 0)
              )}
            </div>
            <div className="summary-label">Total Value</div>
          </div>
        </div>
      )}

      <div className="order-content">
        {!selectedStore ? (
          <div className="empty-state">
            {React.createElement(FiPackage as any, { size: 64, color: '#9ca3af' })}
            <h3>Select a Store</h3>
            <p>Choose a store from the dropdown to view its products</p>
          </div>
        ) : isLoading || columnsLoading ? (
          <div className="loading-state">
            <ClipLoader size={40} color="#667eea" />
            <p>Loading products for {selectedStoreName}...</p>
          </div>
        ) : products.length === 0 ? (
          <div className="empty-state">
            {React.createElement(FiPackage as any, { size: 64, color: '#9ca3af' })}
            <h3>No Products Found</h3>
            <p>No products found for {selectedStoreName}. Add your first product to get started.</p>
            <button onClick={() => setShowManualEntry(true)} className="action-button">
              Add Product
            </button>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="empty-state">
            {React.createElement(FiSearch as any, { size: 64, color: '#9ca3af' })}
            <h3>No Results Found</h3>
            <p>No products match your current search and filters.</p>
            <button onClick={() => { setSearchTerm(''); setTypeFilter('all'); setVendorFilter('all'); }} className="action-button">
              Clear Filters
            </button>
          </div>
        ) : (
          <div className="order-table">
            <div className="table-header">
              {visibleColumnDefs.map(col => (
                <div key={col.key} className="header-cell" title={col.description}>
                  {col.label}
                </div>
              ))}
            </div>
            <div className="table-body">
              {filteredProducts.map((product) => (
                <div key={product.id} className="table-row">
                  {visibleColumnDefs.map(col => (
                    <div key={col.key} className={`cell ${col.key}-cell`}>
                      {getCellValue(product, col.key)}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Manual Entry Modal */}
      <ManualEntryModal
        isOpen={showManualEntry}
        onClose={() => setShowManualEntry(false)}
        onSubmit={handleManualEntry}
        title="Add New Product"
        type="product"
        stores={stores}
        selectedStore={selectedStore}
      />
    </div>
  );
};

export default ProductsPage;