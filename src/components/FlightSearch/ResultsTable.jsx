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

    const searchLower = tableSearchText.toLowerCase();
    return searchResults.routes.filter(route => (
      route.departure.toLowerCase().includes(searchLower) ||
      route.arrival.toLowerCase().includes(searchLower) ||
      route.connections.join(' ').toLowerCase().includes(searchLower) ||
      route.YPrice.toString().includes(searchLower) ||
      route.JPrice.toString().includes(searchLower) ||
      route.FPrice.toString().includes(searchLower) ||
      (route.Ynet || '').toLowerCase().includes(searchLower) ||
      (route.Jnet || '').toLowerCase().includes(searchLower) ||
      (route.Fnet || '').toLowerCase().includes(searchLower)
    ));
  };

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
      <Table
        dataSource={getFilteredData()}
        columns={getResultColumns(onRouteSelect)}
        rowKey={(record, index) => index}
        pagination={{
          ...pagination,
          showSizeChanger: true,
          showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} routes`,
          pageSizeOptions: ['10', '25', '50', '100'],
          defaultPageSize: 25,
        }}
        loading={isLoading}
        onChange={onTableChange}
        scroll={{ x: 1600 }}
        showSorterTooltip={true}
        sortDirections={['ascend', 'descend']}
        style={{ width: '100%' }}
      />

      <style jsx>{`
        :global(.ant-table) {
          font-family: source-code-pro, Menlo, Monaco, Consolas, 'Courier New', monospace;
        }
        :global(.ant-card-body) {
          padding: 12px;
          max-width: 100%;
          overflow-x: auto;
        }
        :global(.ant-table-wrapper) {
          width: 100%;
        }
      `}</style>
    </Card>
  );
};

export default ResultsTable; 