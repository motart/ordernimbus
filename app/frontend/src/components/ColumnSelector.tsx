import React, { useState, useEffect, useRef } from 'react';
import { FiColumns, FiCheck, FiEye, FiEyeOff, FiRefreshCw } from 'react-icons/fi';
import './ColumnSelector.css';

export interface ColumnDefinition {
  key: string;
  label: string;
  defaultVisible?: boolean;
  required?: boolean; // Some columns can't be hidden
  category?: string; // Group columns by category
  description?: string; // Tooltip description
}

interface ColumnSelectorProps {
  columns: ColumnDefinition[];
  visibleColumns: string[];
  onColumnToggle: (columnKey: string) => void;
  onReset: () => void;
  storageKey: string; // For localStorage persistence
  position?: 'left' | 'right';
}

const ColumnSelector: React.FC<ColumnSelectorProps> = ({
  columns,
  visibleColumns,
  onColumnToggle,
  onReset,
  storageKey,
  position = 'right'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Group columns by category
  const groupedColumns = columns.reduce((acc, column) => {
    const category = column.category || 'General';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(column);
    return acc;
  }, {} as Record<string, ColumnDefinition[]>);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Filter columns based on search
  const filterColumns = (cols: ColumnDefinition[]) => {
    if (!searchTerm) return cols;
    return cols.filter(col => 
      col.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
      col.key.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  const handleToggleAll = (show: boolean) => {
    columns.forEach(col => {
      if (!col.required) {
        const isVisible = visibleColumns.includes(col.key);
        if ((show && !isVisible) || (!show && isVisible)) {
          onColumnToggle(col.key);
        }
      }
    });
  };

  const visibleCount = visibleColumns.length;
  const totalCount = columns.filter(c => !c.required).length;

  return (
    <div className="column-selector" ref={dropdownRef}>
      <button
        className="column-selector-trigger"
        onClick={() => setIsOpen(!isOpen)}
        title="Configure columns"
      >
        {React.createElement(FiColumns as any)}
        <span>Columns ({visibleCount}/{totalCount + columns.filter(c => c.required).length})</span>
      </button>

      {isOpen && (
        <div className={`column-selector-dropdown ${position}`}>
          <div className="column-selector-header">
            <h3>Configure Columns</h3>
            <button
              className="close-btn"
              onClick={() => setIsOpen(false)}
            >
              ×
            </button>
          </div>

          <div className="column-selector-search">
            <input
              type="text"
              placeholder="Search columns..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="column-selector-actions">
            <button
              className="action-btn"
              onClick={() => handleToggleAll(true)}
              title="Show all columns"
            >
              {React.createElement(FiEye as any)}
              Show All
            </button>
            <button
              className="action-btn"
              onClick={() => handleToggleAll(false)}
              title="Hide all optional columns"
            >
              {React.createElement(FiEyeOff as any)}
              Hide All
            </button>
            <button
              className="action-btn"
              onClick={onReset}
              title="Reset to defaults"
            >
              {React.createElement(FiRefreshCw as any)}
              Reset
            </button>
          </div>

          <div className="column-selector-list">
            {Object.entries(groupedColumns).map(([category, categoryColumns]) => {
              const filteredColumns = filterColumns(categoryColumns);
              if (filteredColumns.length === 0) return null;

              return (
                <div key={category} className="column-category">
                  <div className="category-header">{category}</div>
                  {filteredColumns.map(column => (
                    <label
                      key={column.key}
                      className={`column-item ${column.required ? 'required' : ''}`}
                      title={column.description}
                    >
                      <input
                        type="checkbox"
                        checked={visibleColumns.includes(column.key)}
                        onChange={() => onColumnToggle(column.key)}
                        disabled={column.required}
                      />
                      <span className="checkbox-custom">
                        {visibleColumns.includes(column.key) && 
                          React.createElement(FiCheck as any, { size: 12 })}
                      </span>
                      <span className="column-label">
                        {column.label}
                        {column.required && <span className="required-badge">Required</span>}
                      </span>
                    </label>
                  ))}
                </div>
              );
            })}
          </div>

          <div className="column-selector-footer">
            <div className="footer-info">
              {visibleCount} of {totalCount + columns.filter(c => c.required).length} columns visible
            </div>
            <button
              className="apply-btn"
              onClick={() => setIsOpen(false)}
            >
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ColumnSelector;