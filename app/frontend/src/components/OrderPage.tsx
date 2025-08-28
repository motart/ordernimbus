import React, { useState, useEffect, useMemo, useRef } from 'react';
import './OrderPage.css';
import '../styles/table-scroll.css';
import toast from 'react-hot-toast';
import { ClipLoader } from 'react-spinners';
import { FiRefreshCw, FiSearch, FiFilter, FiShoppingBag, FiCheckCircle, FiClock, FiX, FiAlertCircle, FiUpload, FiPlus } from 'react-icons/fi';
import CSVUploadModal from './CSVUploadModal';
import ManualEntryModal from './ManualEntryModal';
import ColumnSelector from './ColumnSelector';
import { useColumnVisibility } from '../hooks/useColumnVisibility';
import { ORDER_COLUMNS } from '../config/columnDefinitions';
import './CSVUploadModal.css';
import './ManualEntryModal.css';
import { useAuth } from '../contexts/AuthContext';
import { createAuthenticatedFetch } from '../utils/authenticatedFetch';

// Extended Order interface to match all possible fields from Shopify and CSV
interface Order {
  // Essential fields
  id: string;
  orderId?: string;
  storeId: string;
  orderNumber?: string;
  name?: string;
  customerName?: string;
  customerEmail?: string;
  totalPrice: string | number;
  financialStatus: string;
  fulfillmentStatus: string | null;
  orderDate?: string;
  created_at?: string;
  
  // Customer details
  customerId?: string;
  email?: string;
  phone?: string;
  
  // Order details
  itemCount?: number;
  lineItems?: number;
  subtotal?: string | number;
  totalTax?: string | number;
  totalShipping?: string | number;
  totalDiscount?: string | number;
  currency?: string;
  tags?: string;
  note?: string;
  
  // Billing address
  billing_first_name?: string;
  billing_last_name?: string;
  billing_address1?: string;
  billing_address2?: string;
  billing_city?: string;
  billing_province?: string;
  billing_zip?: string;
  billing_country?: string;
  
  // Shipping address
  shipping_first_name?: string;
  shipping_last_name?: string;
  shipping_address1?: string;
  shipping_address2?: string;
  shipping_city?: string;
  shipping_province?: string;
  shipping_zip?: string;
  shipping_country?: string;
  shippingMethod?: string;
  
  // Line items summary
  lineitem_name?: string;
  lineitem_quantity?: number;
  lineitem_price?: string;
  lineitem_sku?: string;
  line_items?: any[];
  
  // Timestamps
  createdAt?: string;
  updatedAt?: string;
  updated_at?: string;
  syncedAt?: string;
  
  // System fields
  storeDomain?: string;
}

interface Store {
  id: string;
  name: string;
  type: string;
}

const OrderPage: React.FC = () => {
  const { getAccessToken } = useAuth();
  const authenticatedFetch = createAuthenticatedFetch({ getAccessToken });
  const tableScrollRef = useRef<HTMLDivElement>(null);
  
  const [orders, setOrders] = useState<Order[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStore, setSelectedStore] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [fulfillmentFilter, setFulfillmentFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showCSVUpload, setShowCSVUpload] = useState(false);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [selectedStoreName, setSelectedStoreName] = useState('');

  // Column visibility management
  const {
    visibleColumns,
    toggleColumn,
    resetColumns,
    isLoading: columnsLoading,
    isSaving: columnsSaving
  } = useColumnVisibility({
    columns: ORDER_COLUMNS,
    storageKey: 'orders-table'
  });

  // Get only visible column definitions
  const visibleColumnDefinitions = useMemo(() => {
    return ORDER_COLUMNS.filter(col => visibleColumns.includes(col.key));
  }, [visibleColumns]);

  useEffect(() => {
    loadStores();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Only load orders if we have stores loaded (or if loading a specific store)
    if (selectedStore === 'all') {
      // Only load all orders if stores are loaded
      if (stores.length > 0) {
        loadAllOrders();
      }
    } else if (selectedStore) {
      loadOrders();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStore, stores]);

  // Handle horizontal scroll shadow indicators
  useEffect(() => {
    const handleScroll = () => {
      if (!tableScrollRef.current) return;
      
      const element = tableScrollRef.current;
      const isScrollable = element.scrollWidth > element.clientWidth;
      const scrolledRight = element.scrollLeft > 0;
      const fullyScrolled = element.scrollLeft + element.clientWidth >= element.scrollWidth - 1;
      
      // Add/remove classes for shadow indicators
      if (isScrollable) {
        element.classList.add('has-scroll');
      } else {
        element.classList.remove('has-scroll');
      }
      
      if (scrolledRight) {
        element.classList.add('scrolled-right');
      } else {
        element.classList.remove('scrolled-right');
      }
      
      if (fullyScrolled) {
        element.classList.remove('has-scroll');
      }
    };

    const scrollContainer = tableScrollRef.current;
    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', handleScroll);
      // Check initial state
      handleScroll();
      
      // Re-check when window resizes
      const resizeObserver = new ResizeObserver(handleScroll);
      resizeObserver.observe(scrollContainer);
      
      return () => {
        scrollContainer.removeEventListener('scroll', handleScroll);
        resizeObserver.disconnect();
      };
    }
  }, [orders.length, searchTerm, statusFilter, fulfillmentFilter, visibleColumns]); // Re-check when data or columns change

  const loadStores = async () => {
    try {
      const response = await authenticatedFetch(`/api/stores`);

      if (response.ok) {
        const data = await response.json();
        setStores(data.stores || []);
        
        if (data.stores && data.stores.length === 1) {
          setSelectedStore(data.stores[0].id);
        }
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Failed to load stores');
        setStores([]);
      }
    } catch (error) {
      console.error('Error loading stores:', error);
      toast.error('Error loading stores');
      setStores([]);
    }
  };

  const loadOrders = async () => {
    if (!selectedStore || selectedStore === 'all') {
      return;
    }

    setIsLoading(true);
    try {
      const response = await authenticatedFetch(`/api/orders?storeId=${selectedStore}`);

      if (response.ok) {
        const data = await response.json();
        // Normalize order data to match our extended interface
        const normalizedOrders = (data.orders || []).map((order: any) => ({
          ...order,
          orderNumber: order.orderNumber || order.name || order.id,
          customerName: order.customerName || order.customer_name || 
            (order.billing_first_name && order.billing_last_name ? 
              `${order.billing_first_name} ${order.billing_last_name}` : 
              order.email || 'Guest'),
          customerEmail: order.customerEmail || order.email || order.customer_email,
          totalPrice: order.totalPrice || order.total_price || order.total || 0,
          financialStatus: order.financialStatus || order.financial_status || order.payment_status || 'pending',
          fulfillmentStatus: order.fulfillmentStatus || order.fulfillment_status || order.shipping_status || null,
          orderDate: order.orderDate || order.created_at || order.createdAt,
          itemCount: order.itemCount || order.lineItems || order.line_items?.length || 0
        }));
        setOrders(normalizedOrders);
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Failed to load orders');
        setOrders([]);
      }
    } catch (error) {
      console.error('Error loading orders:', error);
      toast.error('Error loading orders');
      setOrders([]);
    } finally {
      setIsLoading(false);
    }
  };

  const loadAllOrders = async () => {
    // Don't try to load if no stores available
    if (!stores || stores.length === 0) {
      setIsLoading(false);
      setOrders([]);
      return;
    }

    setIsLoading(true);
    try {
      const allOrders: Order[] = [];
      
      for (const store of stores) {
        const response = await authenticatedFetch(`/api/orders?storeId=${store.id}`);
        
        if (response.ok) {
          const data = await response.json();
          const storeOrders = (data.orders || []).map((order: any) => ({
            ...order,
            storeId: store.id,
            storeName: store.name,
            orderNumber: order.orderNumber || order.name || order.id,
            customerName: order.customerName || order.customer_name || 
              (order.billing_first_name && order.billing_last_name ? 
                `${order.billing_first_name} ${order.billing_last_name}` : 
                order.email || 'Guest'),
            customerEmail: order.customerEmail || order.email || order.customer_email,
            totalPrice: order.totalPrice || order.total_price || order.total || 0,
            financialStatus: order.financialStatus || order.financial_status || order.payment_status || 'pending',
            fulfillmentStatus: order.fulfillmentStatus || order.fulfillment_status || order.shipping_status || null,
            orderDate: order.orderDate || order.created_at || order.createdAt,
            itemCount: order.itemCount || order.lineItems || order.line_items?.length || 0
          }));
          allOrders.push(...storeOrders);
        }
      }
      
      setOrders(allOrders);
    } catch (error) {
      console.error('Error loading all orders:', error);
      toast.error('Error loading orders');
      setOrders([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    if (selectedStore === 'all') {
      await loadAllOrders();
    } else {
      await loadOrders();
    }
    setIsRefreshing(false);
    toast.success('Orders refreshed');
  };

  const handleCSVUploadClick = () => {
    if (selectedStore === 'all') {
      toast.error('Please select a specific store to upload orders');
      return;
    }
    const store = stores.find(s => s.id === selectedStore);
    setSelectedStoreName(store?.name || '');
    setShowCSVUpload(true);
  };

  const handleCSVUpload = async (csvData: any[], columnMappings: any, dataType: string) => {
    try {
      const response = await authenticatedFetch(`/api/data/upload`, {
        method: 'POST',
        body: JSON.stringify({
          storeId: selectedStore,
          dataType: 'orders',
          records: csvData,
          mappedColumns: columnMappings
        })
      });

      if (response.ok) {
        const result = await response.json();
        toast.success(`Successfully imported ${result.results?.successful || csvData.length} orders`);
        await loadOrders();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to upload CSV data');
      }
    } catch (error) {
      console.error('Error uploading CSV:', error);
      toast.error(`Failed to upload CSV: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  };

  const formatCurrency = (amount: string | number) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(num || 0);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '--';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { className: string; icon: React.ReactElement }> = {
      'paid': { className: 'paid', icon: React.createElement(FiCheckCircle as any) },
      'pending': { className: 'pending', icon: React.createElement(FiClock as any) },
      'refunded': { className: 'refunded', icon: React.createElement(FiX as any) },
      'failed': { className: 'failed', icon: React.createElement(FiAlertCircle as any) },
    };
    
    const config = statusMap[status] || statusMap['pending'];
    
    return (
      <span className={`status-badge ${config.className}`}>
        {config.icon}
        {status}
      </span>
    );
  };

  const getFulfillmentBadge = (status: string | null) => {
    if (!status) return <span className="fulfillment-badge unfulfilled">Unfulfilled</span>;
    
    const className = status === 'fulfilled' ? 'fulfilled' : status === 'partial' ? 'partial' : 'unfulfilled';
    return <span className={`fulfillment-badge ${className}`}>{status}</span>;
  };

  // Render table cell based on column key
  const renderTableCell = (order: Order, columnKey: string) => {
    const value = order[columnKey as keyof Order];
    
    switch (columnKey) {
      case 'orderNumber':
      case 'name':
        return <span className="order-number">{value || order.id}</span>;
      
      case 'customerName':
        return (
          <div className="customer-info">
            <div className="customer-name">{value || 'Guest'}</div>
            {order.customerEmail && <div className="customer-email">{order.customerEmail}</div>}
          </div>
        );
      
      case 'totalPrice':
      case 'subtotal':
      case 'totalTax':
      case 'totalShipping':
      case 'totalDiscount':
        return <span className="price">{formatCurrency(value as string | number)}</span>;
      
      case 'financialStatus':
        return getStatusBadge(value as string);
      
      case 'fulfillmentStatus':
        return getFulfillmentBadge(value as string | null);
      
      case 'orderDate':
      case 'created_at':
      case 'createdAt':
      case 'updated_at':
      case 'updatedAt':
      case 'syncedAt':
        return formatDate(value as string);
      
      case 'itemCount':
      case 'lineItems':
        return <span className="item-count">{value || 0} items</span>;
      
      case 'tags':
        return value ? (
          <div className="tags">
            {(value as string).split(',').map((tag, i) => (
              <span key={i} className="tag">{tag.trim()}</span>
            ))}
          </div>
        ) : '--';
      
      default:
        return <span>{value?.toString() || '--'}</span>;
    }
  };

  // Filter orders based on search and filters
  const filteredOrders = orders.filter(order => {
    if (searchTerm && !JSON.stringify(order).toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    
    if (statusFilter !== 'all' && order.financialStatus !== statusFilter) {
      return false;
    }
    
    if (fulfillmentFilter !== 'all') {
      const fulfillmentStatus = order.fulfillmentStatus || 'unfulfilled';
      if (fulfillmentFilter !== fulfillmentStatus) {
        return false;
      }
    }
    
    return true;
  });

  const orderStats = {
    total: filteredOrders.length,
    totalRevenue: filteredOrders.reduce((sum, order) => {
      const price = typeof order.totalPrice === 'string' ? parseFloat(order.totalPrice) : order.totalPrice;
      return sum + (price || 0);
    }, 0),
    paid: filteredOrders.filter(o => o.financialStatus === 'paid').length,
    pending: filteredOrders.filter(o => o.financialStatus === 'pending').length,
    fulfilled: filteredOrders.filter(o => o.fulfillmentStatus === 'fulfilled').length
  };

  return (
    <div className="orders-page">
      <header className="orders-header">
        <div className="header-content">
          <div className="header-left">
            <h1>Order Management</h1>
            <p>View and manage all your orders across stores</p>
          </div>
          <div className="header-actions">
            <ColumnSelector
              columns={ORDER_COLUMNS}
              visibleColumns={visibleColumns}
              onColumnToggle={toggleColumn}
              onReset={resetColumns}
              storageKey="orders-table"
              position="right"
            />
            <button onClick={handleCSVUploadClick} className="csv-upload-btn">
              {React.createElement(FiUpload as any)}
              Upload CSV
            </button>
            <button onClick={() => setShowManualEntry(true)} className="manual-entry-btn">
              {React.createElement(FiPlus as any)}
              Add Order
            </button>
            <button onClick={handleRefresh} disabled={isRefreshing} className="refresh-btn">
              {React.createElement(FiRefreshCw as any, { className: isRefreshing ? 'spinning' : '' })}
              {isRefreshing ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>
      </header>

      <div className="orders-controls">
        <div className="controls-row">
          <div className="store-selector">
            <select value={selectedStore} onChange={(e) => setSelectedStore(e.target.value)}>
              {stores.length > 1 && <option value="all">All Stores</option>}
              {stores.map(store => (
                <option key={store.id} value={store.id}>{store.name}</option>
              ))}
              {stores.length === 0 && <option value="">No stores available</option>}
            </select>
          </div>

          <div className="search-container">
            {React.createElement(FiSearch as any, { className: 'search-icon' })}
            <input
              type="text"
              placeholder="Search orders..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>

          <div className="filter-container">
            {React.createElement(FiFilter as any, { className: 'filter-icon' })}
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="filter-select">
              <option value="all">All Statuses</option>
              <option value="paid">Paid</option>
              <option value="pending">Pending</option>
              <option value="refunded">Refunded</option>
              <option value="failed">Failed</option>
            </select>
          </div>

          <div className="filter-container">
            <select value={fulfillmentFilter} onChange={(e) => setFulfillmentFilter(e.target.value)} className="filter-select">
              <option value="all">All Fulfillment</option>
              <option value="fulfilled">Fulfilled</option>
              <option value="unfulfilled">Unfulfilled</option>
              <option value="partial">Partial</option>
            </select>
          </div>
        </div>
      </div>

      {orders.length > 0 && (
        <div className="order-summary">
          <div className="summary-card">
            <div className="summary-icon">{React.createElement(FiShoppingBag as any)}</div>
            <div>
              <div className="summary-value">{orderStats.total}</div>
              <div className="summary-label">Total Orders</div>
            </div>
          </div>
          <div className="summary-card">
            <div className="summary-value">{formatCurrency(orderStats.totalRevenue)}</div>
            <div className="summary-label">Total Revenue</div>
          </div>
          <div className="summary-card">
            <div className="summary-value">{orderStats.paid}</div>
            <div className="summary-label">Paid Orders</div>
          </div>
          <div className="summary-card">
            <div className="summary-value">{orderStats.fulfilled}</div>
            <div className="summary-label">Fulfilled</div>
          </div>
        </div>
      )}

      <div className="orders-content">
        {isLoading || columnsLoading ? (
          <div className="loading-state">
            <ClipLoader size={40} color="#667eea" />
            <p>Loading orders...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="empty-state">
            {React.createElement(FiShoppingBag as any, { size: 64, color: '#9ca3af' })}
            <h3>No Orders Found</h3>
            <p>No orders in your stores yet or select a store to view its orders.</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="empty-state">
            {React.createElement(FiSearch as any, { size: 64, color: '#9ca3af' })}
            <h3>No Results Found</h3>
            <p>No orders match your current search and filters.</p>
            <button onClick={() => { setSearchTerm(''); setStatusFilter('all'); setFulfillmentFilter('all'); }} className="action-button">
              Clear Filters
            </button>
          </div>
        ) : (
          <div className="table-scroll-container" ref={tableScrollRef}>
            <div className="table-wrapper">
              <table className="orders-table">
                <thead>
                  <tr>
                    {visibleColumnDefinitions.map(column => (
                      <th key={column.key}>{column.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map((order) => (
                    <tr key={order.id}>
                      {visibleColumnDefinitions.map(column => (
                        <td key={column.key}>
                          {renderTableCell(order, column.key)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {columnsSaving && (
              <div className="saving-indicator">
                Saving column preferences...
              </div>
            )}
          </div>
        )}
      </div>

      {/* CSV Upload Modal */}
      <CSVUploadModal
        isOpen={showCSVUpload}
        onClose={() => setShowCSVUpload(false)}
        onUpload={handleCSVUpload}
        storeId={selectedStore}
        storeName={selectedStoreName}
      />

      {/* Manual Entry Modal */}
      <ManualEntryModal
        isOpen={showManualEntry}
        onClose={() => setShowManualEntry(false)}
        onSubmit={async (orderData) => {
          // Handle manual order creation
          // TODO: Implement manual order creation
        }}
        title="Add New Order"
        type="order"
        stores={stores}
      />
    </div>
  );
};

export default OrderPage;