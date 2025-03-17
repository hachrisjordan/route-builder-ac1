import React, { useState, useEffect } from 'react';
import { Table, Card, Input, Radio } from 'antd';
import { getResultColumns } from './columns';

const ResultsTable = ({ 
  searchResults, 
  isLoading, 
  pagination, 
  onTableChange,
  onRouteSelect 
}) => {
  const [tableSearchText, setTableSearchText] = useState('');
  const [selectedDays, setSelectedDays] = useState(60);
  const [isDaysChanging, setIsDaysChanging] = useState(false);
  const previousDays = React.useRef(60);

  // Helper function to map sorting field based on days
  const mapSortField = (field, oldDays, newDays) => {
    if (!field) return null;
    
    // Special case for 60 days - use base net fields
    if (newDays === 60) {
      return field.replace(/[YJF]T\d+net/, match => match.replace(/T\d+net/, 'net'));
    }
    
    // Map from base net field to T{days}net field
    if (!field.includes('T')) {
      return field.replace(/[YJF]net/, match => match.replace('net', `T${newDays}net`));
    }
    
    // For other days, map to the corresponding T{days}net field
    const mappedField = field.replace(
      new RegExp(`[YJF]T${oldDays}net`),
      match => match.replace(`${oldDays}net`, `${newDays}net`)
    );
    
    return mappedField;
  };

  const getFilteredData = () => {
    let data = searchResults?.routes || [];
    console.log('Initial data:', data.length, 'rows');
    
    // Apply search filter if there's search text
    if (tableSearchText) {
      const searchTerms = tableSearchText.toLowerCase().split(/\s+/).filter(term => term.length > 0);
      
      data = data.filter(route => {
        // If no search terms, include all routes
        if (searchTerms.length === 0) return true;
        
        // For exact airport pair searches (e.g., "BLR DEL")
        if (searchTerms.length === 2) {
          const [term1, term2] = searchTerms;
          
          // Check if the search terms match the exact airport pair (in either order)
          const exactMatch = 
            (route.departure.toLowerCase() === term1 && route.arrival.toLowerCase() === term2) ||
            (route.departure.toLowerCase() === term2 && route.arrival.toLowerCase() === term1);
            
          if (exactMatch) return true;
        }
        
        // Fall back to the regular search if no exact match
        return searchTerms.every(term => (
          route.departure.toLowerCase().includes(term) ||
          route.arrival.toLowerCase().includes(term) ||
          route.connections.join(' ').toLowerCase().includes(term) ||
          route.YPrice.toString().includes(term) ||
          route.JPrice.toString().includes(term) ||
          route.FPrice.toString().includes(term) ||
          (route.Ynet || '').toLowerCase().includes(term) ||
          (route.Jnet || '').toLowerCase().includes(term) ||
          (route.Fnet || '').toLowerCase().includes(term)
        ));
      });
      console.log('After search filter:', data.length, 'rows');
    }

    // Apply sorting if there's a sort field
    if (pagination?.sortField && pagination?.sortOrder) {
      console.log('Applying sort:', { field: pagination.sortField, order: pagination.sortOrder });
      data.sort((a, b) => {
        const aValue = a[pagination.sortField];
        const bValue = b[pagination.sortField];
        
        // Handle null/undefined values
        if (aValue === null || aValue === undefined) return 1;
        if (bValue === null || bValue === undefined) return -1;
        if (aValue === bValue) return 0;
        
        // Convert to numbers for comparison
        const aNum = parseFloat(aValue);
        const bNum = parseFloat(bValue);
        
        // If both values are valid numbers, use numeric comparison
        if (!isNaN(aNum) && !isNaN(bNum)) {
          return pagination.sortOrder === 'ascend' ? aNum - bNum : bNum - aNum;
        }
        
        // Fall back to string comparison for non-numeric values
        const comparison = String(aValue).localeCompare(String(bValue));
        return pagination.sortOrder === 'ascend' ? comparison : -comparison;
      });
      console.log('After sorting - First few rows:', data.slice(0, 3).map(r => ({
        route: `${r.departure}-${r.arrival}`,
        value: r[pagination.sortField]
      })));
    }

    return data;
  };

  // Get filtered data once to use in multiple places
  const filteredData = getFilteredData();
  
  // Reset to first page when search text changes
  // Using useRef to prevent infinite loops with the onTableChange callback
  const previousSearchText = React.useRef(tableSearchText);
  
  // Reset to first page when days selection changes, but preserve sorting
  useEffect(() => {
    if (onTableChange && pagination) {
      console.log('=== Days Change Effect ===');
      console.log('Previous days:', previousDays.current);
      console.log('New days:', selectedDays);
      console.log('Current sorting:', { field: pagination.sortField, order: pagination.sortOrder });
      
      // Set loading state immediately
      setIsDaysChanging(true);
      
      // Delay the data remapping by 0.2s
      setTimeout(() => {
        // Map the sort field to the new day selection
        const mappedField = mapSortField(pagination.sortField, previousDays.current, selectedDays);
        const newSorter = mappedField ? { field: mappedField, order: pagination.sortOrder } : null;
        
        console.log('Mapped field:', mappedField);
        console.log('New sorter being applied:', newSorter);
        
        // Update the previous days value first
        previousDays.current = selectedDays;
        
        // Then trigger the table change with the new sorting
        onTableChange(
          { ...pagination, current: 1 }, 
          pagination.filters,
          newSorter
        );

        // Clear loading state after a short delay to ensure smooth transition
        setTimeout(() => {
          setIsDaysChanging(false);
        }, 100);
      }, 200);
      
      console.log('=== End Days Change Effect ===');
    }
  }, [selectedDays]);

  // Log table props before render
  console.log('=== Table Props ===');
  console.log('Sorting props:', {
    defaultSortOrder: pagination.sortOrder,
    sortOrder: pagination.sortOrder,
    sortField: pagination.sortField
  });
  console.log('Pagination:', pagination);
  console.log('Filtered data length:', filteredData.length);
  console.log('=== End Table Props ===');

  return (
    <Card 
      className="results-card" 
      title={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <span>Search Results</span>
            <Radio.Group 
              value={selectedDays} 
              onChange={e => {
                console.log('Changing days from', selectedDays, 'to', e.target.value);
                console.log('Current sorting:', { field: pagination.sortField, order: pagination.sortOrder });
                setSelectedDays(e.target.value);
              }}
              size="small"
              optionType="button"
              buttonStyle="solid"
              disabled={isDaysChanging}
            >
              <Radio.Button value={3}>T-3</Radio.Button>
              <Radio.Button value={7}>T-7</Radio.Button>
              <Radio.Button value={14}>T-14</Radio.Button>
              <Radio.Button value={28}>T-28</Radio.Button>
              <Radio.Button value={60}>T-60</Radio.Button>
            </Radio.Group>
          </div>
          <Input
            placeholder="Search routes..."
            value={tableSearchText}
            onChange={e => setTableSearchText(e.target.value)}
            style={{ width: 200 }}
            allowClear
            disabled={isDaysChanging}
          />
        </div>
      }
      style={{ 
        boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.03), 0 1px 6px -1px rgba(0, 0, 0, 0.02), 0 2px 4px 0 rgba(0, 0, 0, 0.02)',
        marginTop: 24
      }}
    >
      <div className="table-container" style={{ width: '100%', overflowX: 'auto', minWidth: '1600px' }}>
        <Table
          dataSource={filteredData}
          columns={getResultColumns(onRouteSelect, selectedDays, pagination.sortField, pagination.sortOrder)}
          rowKey={(record, index) => index}
          pagination={{
            ...pagination,
            showSizeChanger: true,
            showTotal: (total, range) => {
              // Ensure range doesn't exceed total
              const adjustedEnd = Math.min(range[1], total);
              const adjustedStart = total === 0 ? 0 : range[0];
              return `${adjustedStart}-${adjustedEnd} of ${total} routes`;
            },
            pageSizeOptions: ['10', '25', '50', '100'],
            defaultPageSize: 25,
            total: filteredData.length,
          }}
          loading={isLoading || isDaysChanging}
          onChange={onTableChange}
          scroll={{ x: 1600 }}
          showSorterTooltip={true}
          style={{ width: '100%' }}
          locale={{
            emptyText: (
              <div style={{ padding: '16px 0', width: '100%' }}>
                No results found
              </div>
            )
          }}
          defaultSortOrder={pagination.sortOrder}
          sortOrder={pagination.sortOrder}
          sortField={pagination.sortField}
        />
      </div>

      <style jsx>{`
        .table-container {
          display: block;
          width: 100%;
        }
        :global(.ant-table) {
          font-family: source-code-pro, Menlo, Monaco, Consolas, 'Courier New', monospace;
          table-layout: fixed;
        }
        :global(.ant-table-tbody > tr) {
          transition: all 0.3s ease-in-out;
        }
        :global(.ant-table-tbody > tr:hover > td) {
          background: #f5f5f5;
          transition: background-color 0.3s ease-in-out;
        }
        :global(.ant-table-thead > tr > th) {
          transition: background-color 0.3s ease-in-out;
        }
        :global(.ant-table-thead > tr > th:hover) {
          background: #fafafa;
        }
        :global(.ant-card-body) {
          padding: 12px;
          max-width: 100%;
          overflow-x: auto;
        }
        :global(.ant-table-wrapper) {
          width: 100%;
        }
        :global(.ant-table-empty .ant-table-content) {
          min-width: 1600px;
        }
        :global(.ant-table-placeholder) {
          min-width: 1600px;
        }
        :global(.ant-empty-normal) {
          margin: 32px 0;
        }
        :global(.ant-table-content) {
          overflow-x: auto;
          min-width: 1600px;
        }
        :global(.ant-table-loading) {
          opacity: 0.7;
          transition: opacity 0.3s ease-in-out;
        }
        :global(.ant-spin-nested-loading) {
          transition: opacity 0.3s ease-in-out;
        }
      `}</style>
    </Card>
  );
};

export default ResultsTable; 