import React, { useState, useEffect } from 'react';
import './CustomersPage.css';
import toast from 'react-hot-toast';
import { ClipLoader } from 'react-spinners';
import { FiRefreshCw, FiSearch, FiFilter, FiUsers, FiPlus, FiMail, FiPhone, FiMapPin } from 'react-icons/fi';
import ManualEntryModal from './ManualEntryModal';
import './ManualEntryModal.css';
import { useAuth } from '../contexts/AuthContext';
import { createAuthenticatedFetch } from '../utils/authenticatedFetch';
import ColumnSelector from './ColumnSelector';
import { useColumnVisibility } from '../hooks/useColumnVisibility';
import { CUSTOMER_COLUMNS } from '../config/columnDefinitions';

interface Customer {
  id: string;
  customerId?: string;
  email: string;
  first_name?: string;
  firstName?: string;
  last_name?: string;
  lastName?: string;
  fullName?: string;
  phone?: string;
  company?: string;
  address?: string;
  address1?: string;
  address2?: string;
  city?: string;
  province?: string;
  state?: string;
  zip?: string;
  country?: string;
  country_code?: string;
  tags?: string;
  notes?: string;
  note?: string;
  created_at?: string;
  createdAt?: string;
  updated_at?: string;
  updatedAt?: string;
  total_orders?: number;
  orders_count?: number;
  total_spent?: string;
  average_order_value?: string;
  last_order_date?: string;
  first_order_date?: string;
  accepts_marketing?: boolean;
  marketing_opt_in_level?: string;
  verified_email?: boolean;
  tax_exempt?: boolean;
  account_activation_email?: string;
  syncedAt?: string;
  storeId?: string;
  storeDomain?: string;
}

const CustomersPage: React.FC = () => {
  const { getAccessToken } = useAuth();
  const authenticatedFetch = createAuthenticatedFetch({ getAccessToken });
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [countryFilter, setCountryFilter] = useState<string>('all');
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
    columns: CUSTOMER_COLUMNS,
    storageKey: 'customers-table',
    defaultVisible: CUSTOMER_COLUMNS
      .filter(col => col.defaultVisible !== false || col.required)
      .map(col => col.key)
  });

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    setIsLoading(true);
    try {
      // userId is now extracted from JWT token on backend
      
      const response = await authenticatedFetch(`/api/customers`);

      if (response.ok) {
        const data = await response.json();
        setCustomers(data.customers || []);
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Failed to load customers');
        setCustomers([]);
      }
    } catch (error) {
      // TODO: Log error to monitoring service
      toast.error('Error loading customers');
      setCustomers([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadCustomers();
    setIsRefreshing(false);
    toast.success('Customers refreshed');
  };

  const handleManualEntry = async (customerData: any) => {
    try {
      // userId is now extracted from JWT token on backend
      
      const response = await authenticatedFetch(`/api/customers`, {
        method: 'POST',
        body: JSON.stringify({
          storeId: customerData.storeId,
          customer: {
            ...customerData,
            id: `manual-${Date.now()}`,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            total_orders: 0,
            total_spent: '0.00'
          }
        })
      });

      if (response.ok) {
        toast.success('Customer created successfully');
        await loadCustomers();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create customer');
      }
    } catch (error) {
      // TODO: Log error to monitoring service
      toast.error(`Failed to create customer: ${error instanceof Error ? error.message : 'Unknown error'}`);
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

  const getCustomerName = (customer: Customer) => {
    if (customer.fullName) return customer.fullName;
    const firstName = customer.firstName || customer.first_name || '';
    const lastName = customer.lastName || customer.last_name || '';
    return `${firstName} ${lastName}`.trim() || '--';
  };

  const getCustomerLocation = (customer: Customer) => {
    const city = customer.city;
    const state = customer.state || customer.province;
    const country = customer.country;
    const parts = [city, state, country].filter(Boolean);
    return parts.join(', ') || '--';
  };

  // Get unique countries for filter
  const countries = Array.from(new Set(customers.map(c => c.country).filter(Boolean)));

  const filteredCustomers = customers.filter(customer => {
    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = 
        getCustomerName(customer).toLowerCase().includes(searchLower) ||
        customer.email?.toLowerCase().includes(searchLower) ||
        customer.phone?.toLowerCase().includes(searchLower) ||
        customer.company?.toLowerCase().includes(searchLower) ||
        getCustomerLocation(customer).toLowerCase().includes(searchLower);
      
      if (!matchesSearch) return false;
    }

    // Country filter
    if (countryFilter !== 'all' && customer.country !== countryFilter) {
      return false;
    }

    return true;
  });

  const customerStats = {
    total: customers.length,
    totalSpent: customers.reduce((sum, customer) => sum + parseFloat(customer.total_spent || '0'), 0),
    avgOrderValue: customers.length > 0 
      ? customers.reduce((sum, customer) => sum + parseFloat(customer.total_spent || '0'), 0) / 
        customers.reduce((sum, customer) => sum + (customer.total_orders || 0), 0 || 1)
      : 0
  };

  // Helper function to get cell value based on column key
  const getCellValue = (customer: Customer, columnKey: string) => {
    switch (columnKey) {
      case 'fullName':
        return (
          <div className="customer-info">
            <div className="customer-name">{getCustomerName(customer)}</div>
            {customer.company && visibleColumns.includes('company') && (
              <div className="customer-company">{customer.company}</div>
            )}
            {customer.tags && visibleColumns.includes('tags') && (
              <div className="customer-tags">
                {customer.tags.split(',').map((tag, index) => (
                  <span key={index} className="tag">{tag.trim()}</span>
                ))}
              </div>
            )}
          </div>
        );
      
      case 'email':
        return (
          <div className="contact-info">
            <div className="contact-item">
              {React.createElement(FiMail as any, { size: 14 })}
              <span>{customer.email}</span>
            </div>
          </div>
        );
      
      case 'phone':
        return customer.phone ? (
          <div className="contact-item">
            {React.createElement(FiPhone as any, { size: 14 })}
            <span>{customer.phone}</span>
          </div>
        ) : '--';
      
      case 'total_orders':
        return <span className="orders-count">{customer.total_orders || customer.orders_count || 0}</span>;
      
      case 'total_spent':
        return <span className="spent-amount">{formatCurrency(customer.total_spent || '0')}</span>;
      
      case 'firstName':
        return customer.firstName || customer.first_name || '--';
      
      case 'lastName':
        return customer.lastName || customer.last_name || '--';
      
      case 'company':
        return customer.company || '--';
      
      case 'customerId':
        return customer.customerId || customer.id || '--';
      
      case 'address':
        return customer.address || '--';
      
      case 'address1':
        return customer.address1 || '--';
      
      case 'address2':
        return customer.address2 || '--';
      
      case 'city':
        return customer.city || '--';
      
      case 'state':
      case 'province':
        return customer.state || customer.province || '--';
      
      case 'zip':
        return customer.zip || '--';
      
      case 'country':
        return customer.country || '--';
      
      case 'country_code':
        return customer.country_code || '--';
      
      case 'tags':
        return customer.tags || '--';
      
      case 'note':
      case 'notes':
        return customer.note || customer.notes || '--';
      
      case 'orders_count':
        return customer.orders_count || customer.total_orders || 0;
      
      case 'average_order_value':
        return formatCurrency(customer.average_order_value);
      
      case 'last_order_date':
        return formatDate(customer.last_order_date);
      
      case 'first_order_date':
        return formatDate(customer.first_order_date);
      
      case 'accepts_marketing':
        return formatBoolean(customer.accepts_marketing);
      
      case 'marketing_opt_in_level':
        return customer.marketing_opt_in_level || '--';
      
      case 'verified_email':
        return formatBoolean(customer.verified_email);
      
      case 'tax_exempt':
        return formatBoolean(customer.tax_exempt);
      
      case 'account_activation_email':
        return customer.account_activation_email || '--';
      
      case 'createdAt':
        return formatDate(customer.createdAt || customer.created_at);
      
      case 'updatedAt':
        return formatDate(customer.updatedAt || customer.updated_at);
      
      case 'syncedAt':
        return formatDate(customer.syncedAt);
      
      case 'storeId':
        return customer.storeId || '--';
      
      case 'storeDomain':
        return customer.storeDomain || '--';
      
      default:
        return '--';
    }
  };

  return (
    <div className="customers-page">
      <header className="customers-header">
        <div className="header-content">
          <div className="header-actions">
            <button 
              onClick={() => setShowManualEntry(true)}
              className="manual-entry-btn"
            >
              {React.createElement(FiPlus as any)}
              Add Customer
            </button>
            <ColumnSelector
              columns={CUSTOMER_COLUMNS}
              visibleColumns={visibleColumns}
              onColumnToggle={toggleColumn}
              onReset={resetColumns}
              storageKey="customers-table"
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

      <div className="customers-controls">
        <div className="controls-row">
          <div className="search-container">
            {React.createElement(FiSearch as any, { className: 'search-icon' })}
            <input
              type="text"
              placeholder="Search customers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>

          <div className="filter-container">
            {React.createElement(FiFilter as any, { className: 'filter-icon' })}
            <select
              value={countryFilter}
              onChange={(e) => setCountryFilter(e.target.value)}
              className="filter-select"
            >
              <option value="all">All Countries</option>
              {countries.map(country => (
                <option key={country} value={country}>{country}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {customers.length > 0 && (
        <div className="customer-summary">
          <div className="summary-card">
            <div className="summary-value">{customerStats.total}</div>
            <div className="summary-label">Total Customers</div>
          </div>
          <div className="summary-card">
            <div className="summary-value">{formatCurrency(customerStats.totalSpent)}</div>
            <div className="summary-label">Total Customer Value</div>
          </div>
          <div className="summary-card">
            <div className="summary-value">{formatCurrency(customerStats.avgOrderValue)}</div>
            <div className="summary-label">Avg Order Value</div>
          </div>
        </div>
      )}

      <div className="customers-content">
        {isLoading || columnsLoading ? (
          <div className="loading-state">
            <ClipLoader size={40} color="#667eea" />
            <p>Loading customers...</p>
          </div>
        ) : customers.length === 0 ? (
          <div className="empty-state">
            {React.createElement(FiUsers as any, { size: 64, color: '#9ca3af' })}
            <h3>No Customers Found</h3>
            <p>No customers in your database yet. Add your first customer to get started.</p>
            <button onClick={() => setShowManualEntry(true)} className="action-button">
              Add Customer
            </button>
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className="empty-state">
            {React.createElement(FiSearch as any, { size: 64, color: '#9ca3af' })}
            <h3>No Results Found</h3>
            <p>No customers match your current search and filters.</p>
            <button onClick={() => { setSearchTerm(''); setCountryFilter('all'); }} className="action-button">
              Clear Filters
            </button>
          </div>
        ) : (
          <div className="customers-table">
            <div className="table-header">
              {getVisibleColumnDefinitions().map(col => (
                <div key={col.key} className="header-cell" title={col.description}>
                  {col.label}
                </div>
              ))}
            </div>
            <div className="table-body">
              {filteredCustomers.map((customer) => (
                <div key={customer.id} className="table-row">
                  {getVisibleColumnDefinitions().map(col => (
                    <div key={col.key} className={`cell ${col.key}-cell`}>
                      {getCellValue(customer, col.key)}
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
        title="Add New Customer"
        type="customer"
        stores={[]}
      />
    </div>
  );
};

export default CustomersPage;