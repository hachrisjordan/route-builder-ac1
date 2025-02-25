import React from 'react';
import { Modal, DatePicker, Input, Spin, Table } from 'antd';
import dayjs from 'dayjs';
import { getSegmentColumns } from './segmentColumns';
import useFlightDetails from './hooks/useFlightDetails';

const FlightDetailsModal = ({ isVisible, currentRoute, onClose }) => {
  const {
    selectedDates,
    setSelectedDates,
    apiKey,
    setApiKey,
    segmentDetails,
    isLoadingSegments,
    handleDateSearch,
    resetDetails,
    columns,
    selectedFlights,
  } = useFlightDetails(getSegmentColumns);

  const handleOk = () => {
    handleDateSearch(currentRoute);
  };

  const handleCancel = () => {
    resetDetails();
    onClose();
  };

  return (
    <Modal
      title="Flight Details"
      open={isVisible}
      onOk={handleOk}
      onCancel={handleCancel}
      okText="Search Flights"
      okButtonProps={{ 
        disabled: !selectedDates || !apiKey,
        loading: isLoadingSegments 
      }}
      width={1500}
      styles={{
        body: { 
          padding: '12px',
          maxWidth: '100%'
        }
      }}
    >
      <div style={{ marginBottom: 16 }}>
        <div style={{ marginBottom: 8 }}>Select Travel Date:</div>
        <DatePicker
          style={{ width: '100%' }}
          onChange={setSelectedDates}
          disabledDate={(current) => current && current < dayjs().startOf('day')}
        />
      </div>
      
      <div style={{ marginBottom: 16 }}>
        <div style={{ marginBottom: 8 }}>API Key:</div>
        <Input
          placeholder="Enter API key"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          style={{ width: '100%' }}
        />
      </div>

      {isLoadingSegments ? (
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <Spin />
        </div>
      ) : (
        <div style={{ 
          width: '100%',
          overflowX: 'auto'
        }}>
          {currentRoute && currentRoute.slice(0, -1).map((from, index) => {
            const to = currentRoute[index + 1];
            const routeKey = `${from}-${to}`;
            const flights = segmentDetails.filter(flight => 
              flight.from === from && flight.to === to
            );

            return (
              <div key={routeKey} style={{ 
                marginBottom: '24px',
                width: '100%'
              }}>
                <h3 style={{ marginBottom: '16px' }}>{routeKey}</h3>
                <Table
                  dataSource={flights}
                  columns={columns}
                  size="small"
                  rowKey={(record, index) => `${routeKey}-${index}`}
                  sortDirections={['ascend', 'descend']}
                  style={{ 
                    width: '100%',
                    tableLayout: 'fixed'
                  }}
                  pagination={{
                    defaultPageSize: 10,
                    showSizeChanger: true,
                    showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} flights`,
                    pageSizeOptions: ['10', '20', '50', 'all'],
                    position: ['bottomRight']
                  }}
                  locale={{
                    emptyText: 'No flights available'
                  }}
                />
              </div>
            );
          })}
        </div>
      )}

      <style jsx>{`
        :global(.ant-table) {
          font-family: source-code-pro, Menlo, Monaco, Consolas, 'Courier New', monospace;
        }
      `}</style>
    </Modal>
  );
};

export default FlightDetailsModal; 