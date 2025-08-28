import React, { useState, useEffect } from 'react';
import './InventoryPage.css';
import toast from 'react-hot-toast';
import { ClipLoader } from 'react-spinners';
import { FiRefreshCw, FiSearch, FiFilter, FiPackage, FiAlertTriangle, FiCheckCircle, FiPlus } from 'react-icons/fi';
import ManualEntryModal from './ManualEntryModal';
import './ManualEntryModal.css';
import { useAuth } from '../contexts/AuthContext';
import { createAuthenticatedFetch } from '../utils/authenticatedFetch';
import ColumnSelector from './ColumnSelector';
import { useColumnVisibility } from '../hooks/useColumnVisibility';
import { INVENTORY_COLUMNS } from '../config/columnDefinitions';

interface InventoryItem {
  id: string;
  inventoryId?: string;
  storeId: string;
  inventoryItemId?: string;
  locationId?: string;
  location?: string;
  location_name?: string;
  warehouse?: string;
  bin?: string;
  aisle?: string;
  shelf?: string;
  available?: number;
  quantity?: number;
  committed?: number;
  incoming?: number;
  reserved?: number;
  on_hand?: number;
  safety_stock?: number;
  reorder_point?: number;
  reorder_quantity?: number;
  updatedAt?: string;
  counted_at?: string;
  syncedAt?: number | string;
  // Product info (joined from products table)
  productId?: string;
  productName?: string;
  title?: string;
  sku?: string;
  vendor?: string;
  productType?: string;
  product_type?: string;
  variantId?: string;
  variantTitle?: string;
  cost?: string | number;
  total_value?: string | number;
  average_cost?: string | number;
  last_sold?: string;
  last_received?: string;
  velocity?: string;
  days_of_inventory?: number;
  storeDomain?: string;
  variants?: Array<{
    id: string;
    title: string;
    price: string;
    sku?: string;
    inventory_item_id: string;
  }>;
}

interface Store {
  id: string;
  name?: string;
  displayName?: string;
  type?: string;
  shopifyDomain?: string;
  syncStatus?: string;
}

const InventoryPage: React.FC = () => {
  const { getAccessToken } = useAuth();
  const authenticatedFetch = createAuthenticatedFetch({ getAccessToken });
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStore, setSelectedStore] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [stockFilter, setStockFilter] = useState<'all' | 'in-stock' | 'low-stock' | 'out-of-stock'>('all');
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
    columns: INVENTORY_COLUMNS,
    storageKey: 'inventory-table',
    defaultVisible: INVENTORY_COLUMNS
      .filter(col => col.defaultVisible !== false || col.required)
      .map(col => col.key)
  });

  useEffect(() => {
    loadStores();
  }, []);

  useEffect(() => {
    if (selectedStore) {
      loadInventory();
    }
  }, [selectedStore]);

  const loadStores = async () => {
    try {
      // userId is now extracted from JWT token on backend
      
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

  const loadInventory = async () => {
    if (!selectedStore) return;
    
    setIsLoading(true);
    try {
      // Always fetch from API - backend handles all data storage
      // userId is now extracted from JWT token on backend
      
      const response = await authenticatedFetch(`/api/inventory?storeId=${selectedStore}`);

      if (response.ok) {
        const data = await response.json();
        setInventory(data.inventory || []);
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Failed to load inventory');
        setInventory([]);
      }
    } catch (error) {
      // TODO: Log error to monitoring service
      toast.error('Error loading inventory');
      setInventory([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadInventory();
    setIsRefreshing(false);
    toast.success('Inventory refreshed');
  };

  const getStockStatus = (available: number) => {
    if (available === 0) return 'out-of-stock';
    if (available < 10) return 'low-stock';
    return 'in-stock';
  };

  const getStockStatusColor = (status: string) => {
    switch (status) {
      case 'out-of-stock': return '#ef4444';
      case 'low-stock': return '#f59e0b';
      case 'in-stock': return '#10b981';
      default: return '#6b7280';
    }
  };

  const getStockStatusIcon = (status: string) => {
    switch (status) {
      case 'out-of-stock': return FiAlertTriangle;
      case 'low-stock': return FiAlertTriangle;
      case 'in-stock': return FiCheckCircle;
      default: return FiPackage;
    }
  };

  const filteredInventory = inventory.filter(item => {
    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = 
        item.title?.toLowerCase().includes(searchLower) ||
        item.vendor?.toLowerCase().includes(searchLower) ||
        item.productType?.toLowerCase().includes(searchLower) ||
        item.variants?.some(v => 
          v.title?.toLowerCase().includes(searchLower) ||
          v.sku?.toLowerCase().includes(searchLower)
        );
      
      if (!matchesSearch) return false;
    }

    // Stock filter
    if (stockFilter !== 'all') {
      const status = getStockStatus(item.available || 0);
      if (status !== stockFilter) return false;
    }

    return true;
  });

  const stockSummary = {
    total: inventory.length,
    inStock: inventory.filter(item => getStockStatus(item.available || 0) === 'in-stock').length,
    lowStock: inventory.filter(item => getStockStatus(item.available || 0) === 'low-stock').length,
    outOfStock: inventory.filter(item => getStockStatus(item.available || 0) === 'out-of-stock').length,
  };

  const selectedStoreObj = stores.find(s => s.id === selectedStore);
  const selectedStoreName = selectedStoreObj ? 
    (selectedStoreObj.displayName || selectedStoreObj.name || selectedStoreObj.shopifyDomain || selectedStoreObj.id) : 
    'Unknown Store';

  // Helper function to format currency
  const formatCurrency = (amount: string | number | undefined) => {
    const num = parseFloat(amount?.toString() || '0');
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(num);
  };

  // Helper function to format date
  const formatDate = (dateString: string | number | undefined) => {
    if (!dateString) return '--';
    const date = typeof dateString === 'number' ? new Date(dateString) : new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Helper function to get cell value based on column key
  const getCellValue = (item: InventoryItem, columnKey: string) => {
    switch (columnKey) {
      case 'sku':
        const sku = item.sku || item.variants?.[0]?.sku || '--';
        return (
          <div className="sku-cell">
            <span className="sku">{sku}</span>
          </div>
        );
      
      case 'productName':
        const productName = item.productName || item.title || '--';
        const variantTitle = item.variantTitle || item.variants?.[0]?.title;
        return (
          <div className="product-cell">
            <span className="product-name">{productName}</span>
            {variantTitle && <span className="variant-name">{variantTitle}</span>}
          </div>
        );
      
      case 'available':
        const available = item.available || 0;
        const status = getStockStatus(available);
        return (
          <div className="stock-cell">
            <span className={`stock-badge ${status}`}>
              {status === 'out-of-stock' && React.createElement(FiAlertTriangle as any, { size: 14 })}
              {status === 'low-stock' && React.createElement(FiAlertTriangle as any, { size: 14 })}
              {status === 'in-stock' && React.createElement(FiCheckCircle as any, { size: 14 })}
              {available}
            </span>
          </div>
        );
      
      case 'quantity':
        return item.quantity || item.available || 0;
      
      case 'location':
        return (
          <span className="location">
            {item.location || item.location_name || 'Default'}
          </span>
        );
      
      case 'inventoryId':
        return item.inventoryId || item.inventoryItemId || item.id || '--';
      
      case 'committed':
        return item.committed || 0;
      
      case 'incoming':
        return item.incoming || 0;
      
      case 'reserved':
        return item.reserved || 0;
      
      case 'on_hand':
        return item.on_hand || 0;
      
      case 'safety_stock':
        return item.safety_stock || '--';
      
      case 'reorder_point':
        return item.reorder_point || '--';
      
      case 'reorder_quantity':
        return item.reorder_quantity || '--';
      
      case 'locationId':
        return item.locationId || '--';
      
      case 'location_name':
        return item.location_name || item.location || '--';
      
      case 'warehouse':
        return item.warehouse || '--';
      
      case 'bin':
        return item.bin || '--';
      
      case 'aisle':
        return item.aisle || '--';
      
      case 'shelf':
        return item.shelf || '--';
      
      case 'productId':
        return item.productId || '--';
      
      case 'variantId':
        return item.variantId || item.variants?.[0]?.id || '--';
      
      case 'variantTitle':
        return item.variantTitle || item.variants?.[0]?.title || '--';
      
      case 'vendor':
        return item.vendor || '--';
      
      case 'product_type':
        return item.product_type || item.productType || '--';
      
      case 'cost':
        return formatCurrency(item.cost);
      
      case 'total_value':
        const value = item.total_value || (parseFloat(item.cost?.toString() || '0') * (item.available || 0));
        return formatCurrency(value);
      
      case 'average_cost':
        return formatCurrency(item.average_cost);
      
      case 'last_sold':
        return formatDate(item.last_sold);
      
      case 'last_received':
        return formatDate(item.last_received);
      
      case 'velocity':
        return item.velocity || '--';
      
      case 'days_of_inventory':
        return item.days_of_inventory || '--';
      
      case 'updatedAt':
        return formatDate(item.updatedAt);
      
      case 'counted_at':
        return formatDate(item.counted_at);
      
      case 'syncedAt':
        return formatDate(item.syncedAt);
      
      case 'storeId':
        return item.storeId || '--';
      
      case 'storeDomain':
        return item.storeDomain || selectedStoreObj?.shopifyDomain || '--';
      
      default:
        return '--';
    }
  };

  const handleManualEntry = async (inventoryData: any) => {
    try {
      // userId is now extracted from JWT token on backend
      
      const response = await authenticatedFetch(`/api/inventory`, {
        method: 'POST',
        body: JSON.stringify({
          storeId: inventoryData.storeId,
          inventory: {
            ...inventoryData,
            id: `manual-${Date.now()}`,
            inventoryItemId: `manual-inv-${Date.now()}`,
            locationId: 'manual-location',
            available: parseInt(inventoryData.available) || 0,
            updatedAt: new Date().toISOString(),
            syncedAt: Date.now()
          }
        })
      });

      if (response.ok) {
        toast.success('Inventory item added successfully');
        await loadInventory();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add inventory item');
      }
    } catch (error) {
      // TODO: Log error to monitoring service
      toast.error(`Failed to add inventory item: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  };

  return (
    <div className="inventory-page">
      <header className="inventory-header">
        <div className="header-content">
          <div className="header-actions">
            {selectedStore && (
              <button 
                onClick={() => setShowManualEntry(true)}
                className="manual-entry-btn"
              >
                {React.createElement(FiPlus as any)}
                Add Inventory
              </button>
            )}
            <ColumnSelector
              columns={INVENTORY_COLUMNS}
              visibleColumns={visibleColumns}
              onColumnToggle={toggleColumn}
              onReset={resetColumns}
              storageKey="inventory-table"
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

      <div className="inventory-controls">
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
              value={stockFilter}
              onChange={(e) => setStockFilter(e.target.value as any)}
              className="filter-select"
            >
              <option value="all">All Stock</option>
              <option value="in-stock">In Stock</option>
              <option value="low-stock">Low Stock</option>
              <option value="out-of-stock">Out of Stock</option>
            </select>
          </div>
        </div>
      </div>

      {selectedStore && (
        <div className="stock-summary">
          <div 
            className={`summary-card ${stockFilter === 'all' ? 'active' : ''}`}
            onClick={() => setStockFilter('all')}
          >
            <div className="summary-value">{stockSummary.total}</div>
            <div className="summary-label">Total Items</div>
          </div>
          <div 
            className={`summary-card in-stock ${stockFilter === 'in-stock' ? 'active' : ''}`}
            onClick={() => setStockFilter('in-stock')}
          >
            <div className="summary-value">{stockSummary.inStock}</div>
            <div className="summary-label">In Stock</div>
          </div>
          <div 
            className={`summary-card low-stock ${stockFilter === 'low-stock' ? 'active' : ''}`}
            onClick={() => setStockFilter('low-stock')}
          >
            <div className="summary-value">{stockSummary.lowStock}</div>
            <div className="summary-label">Low Stock</div>
          </div>
          <div 
            className={`summary-card out-of-stock ${stockFilter === 'out-of-stock' ? 'active' : ''}`}
            onClick={() => setStockFilter('out-of-stock')}
          >
            <div className="summary-value">{stockSummary.outOfStock}</div>
            <div className="summary-label">Out of Stock</div>
          </div>
        </div>
      )}

      <div className="inventory-content">
        {!selectedStore ? (
          <div className="empty-state">
            {React.createElement(FiPackage as any, { size: 64, color: '#9ca3af' })}
            <h3>Select a Store</h3>
            <p>Choose a store from the dropdown to view its inventory</p>
          </div>
        ) : isLoading || columnsLoading ? (
          <div className="loading-state">
            <ClipLoader size={40} color="#667eea" />
            <p>Loading inventory for {selectedStoreName}...</p>
          </div>
        ) : inventory.length === 0 ? (
          <div className="empty-state">
            {React.createElement(FiPackage as any, { size: 64, color: '#9ca3af' })}
            <h3>No Inventory Data</h3>
            <p>No inventory found for {selectedStoreName}. Make sure your store is synced.</p>
            <button onClick={handleRefresh} className="action-button">
              Refresh Inventory
            </button>
          </div>
        ) : filteredInventory.length === 0 ? (
          <div className="empty-state">
            {React.createElement(FiSearch as any, { size: 64, color: '#9ca3af' })}
            <h3>No Results Found</h3>
            <p>No inventory items match your current search and filters.</p>
            <button onClick={() => { setSearchTerm(''); setStockFilter('all'); }} className="action-button">
              Clear Filters
            </button>
          </div>
        ) : (
          <div className="inventory-table">
            <div className="table-header">
              {getVisibleColumnDefinitions().map(col => (
                <div key={col.key} className="header-cell" title={col.description}>
                  {col.label}
                </div>
              ))}
            </div>
            <div className="table-body">
              {filteredInventory.map((item) => (
                <div key={item.id} className="table-row">
                  {getVisibleColumnDefinitions().map(col => (
                    <div key={col.key} className={`cell ${col.key}-cell`}>
                      {getCellValue(item, col.key)}
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
        title="Add Inventory Item"
        type="inventory"
        stores={stores}
        selectedStore={selectedStore}
      />
    </div>
  );
};

export default InventoryPage;