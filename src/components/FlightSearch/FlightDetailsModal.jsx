import React, { useState } from 'react';
import { Modal, DatePicker, Input, Spin, Table } from 'antd';
import dayjs from 'dayjs';
import { getSegmentColumns } from './segmentColumns';
import useFlightDetails from './hooks/useFlightDetails';
const { RangePicker } = DatePicker;

const FlightDetailsModal = ({ isVisible, currentRoute, onClose }) => {
  const [dateRangeError, setDateRangeError] = useState(false);
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
    setDateRangeError(false);
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
        disabled: !selectedDates || !apiKey || dateRangeError,
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
        <div style={{ marginBottom: 8 }}>Select Travel Dates (max 3 days):</div>
        <RangePicker
          style={{ width: '100%' }}
          onChange={(dates) => {
            if (!dates) {
              setSelectedDates(null);
              setDateRangeError(false);
              return;
            }
            setSelectedDates(dates);
          }}
          disabledDate={(current) => {
            if (!current) return false;
            
            // Disable dates before today
            const today = dayjs().startOf('day');
            // Disable dates more than 60 days in the future
            const maxDate = today.add(60, 'days');
            
            // If a start date is selected, only allow selecting up to 3 days after it
            if (selectedDates?.[0] && !selectedDates[1]) {
              const maxEndDate = selectedDates[0].add(2, 'days');
              return current && (
                current < today || 
                current > maxDate
              );
            }
            
            // Default case: just check if it's before today or after maxDate
            return current < today || current > maxDate;
          }}
          value={selectedDates}
          allowEmpty={[false, false]}
          format="YYYY-MM-DD"
          onCalendarChange={(dates) => {
            if (dates?.[0] && dates?.[1]) {
              const daysDiff = dates[1].diff(dates[0], 'days');
              setDateRangeError(daysDiff > 2);
            } else {
              setDateRangeError(false);
            }
          }}
          status={dateRangeError ? "error" : ""}
        />
        {dateRangeError && (
          <div style={{ color: '#ff4d4f', fontSize: '14px', marginTop: '4px' }}>
            Date range cannot exceed 3 days
          </div>
        )}
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