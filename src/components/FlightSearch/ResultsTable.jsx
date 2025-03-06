import React, { useState } from 'react';
import { Table, Card, Input } from 'antd';
import { getResultColumns } from './columns';

const ResultsTable = ({ 
  searchResults, 
  isLoading, 
  pagination, 
  onTableChange,
  onRouteSelect 
}) => {
  const [tableSearchText, setTableSearchText] = useState('');

  const getFilteredData = () => {
    if (!searchResults?.routes || !tableSearchText) {
      return searchResults?.routes || [];
    }

    const searchTerms = tableSearchText.toLowerCase().split(/\s+/).filter(term => term.length > 0);
    
    return searchResults.routes.filter(route => {
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
  };

  // Get filtered data once to use in multiple places
  const filteredData = getFilteredData();
  
  // Reset to first page when search text changes
  // Using useRef to prevent infinite loops with the onTableChange callback
  const previousSearchText = React.useRef(tableSearchText);
  
  React.useEffect(() => {
    // Only trigger table change if the search text has actually changed
    if (previousSearchText.current !== tableSearchText) {
      previousSearchText.current = tableSearchText;
      
      if (onTableChange && pagination) {
        // Use setTimeout to break the update cycle
        setTimeout(() => {
          onTableChange({ ...pagination, current: 1 }, null, null);
        }, 0);
      }
    }
  }, [tableSearchText]);

  return (
    <Card 
      className="results-card" 
      title={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Search Results</span>
          <Input
            placeholder="Search routes..."
            value={tableSearchText}
            onChange={e => setTableSearchText(e.target.value)}
            style={{ width: 200 }}
            allowClear
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
          columns={getResultColumns(onRouteSelect)}
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
          loading={isLoading}
          onChange={onTableChange}
          scroll={{ x: 1600 }}
          showSorterTooltip={true}
          sortDirections={['ascend', 'descend']}
          style={{ width: '100%' }}
          locale={{
            emptyText: (
              <div style={{ padding: '16px 0', width: '100%' }}>
                No results found
              </div>
            )
          }}
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
      `}</style>
    </Card>
  );
};

export default ResultsTable; 