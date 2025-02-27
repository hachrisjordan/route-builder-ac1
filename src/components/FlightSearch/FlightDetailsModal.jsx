import React, { useState, useEffect } from 'react';
import { Modal, DatePicker, Input, Spin, Table, Button, Typography } from 'antd';
import dayjs from 'dayjs';
import { getSegmentColumns } from './segmentColumns';
import useFlightDetails from './hooks/useFlightDetails';
import FlightAvailabilityCalendar from './FlightAvailabilityCalendar';
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
    handleCalendarSearch,
    resetDetails,
    columns,
    selectedFlights,
    availabilityData,
    isLoadingAvailability,
  } = useFlightDetails(getSegmentColumns);

  // Clear data when modal closes
  useEffect(() => {
    if (!isVisible) {
      resetDetails();
      setDateRangeError(false);
      setSelectedDates(null);
      setApiKey('');
    }
  }, [isVisible]);

  const handleOk = () => {
    handleDateSearch(currentRoute);
  };

  const handleCancel = () => {
    onClose();
  };

  const handleCalendarDateSelect = (dateRange) => {
    setSelectedDates(dateRange);
    setDateRangeError(false);
  };

  const handleCalendarSearchClick = () => {
    if (!selectedDates) {
      setDateRangeError(true);
      return;
    }
    handleDateSearch(currentRoute);
  };

  // Function to group flights by segment with safety checks
  const getSegmentTables = () => {
    if (!segmentDetails?.length || !currentRoute?.length) return [];

    // Group flights by segment index
    const segmentGroups = segmentDetails.reduce((acc, flight) => {
      const segmentIndex = flight.segmentIndex;
      if (!acc[segmentIndex]) {
        acc[segmentIndex] = [];
      }
      acc[segmentIndex].push(flight);
      return acc;
    }, {});

    // Convert to array format with segment info
    return Object.entries(segmentGroups).map(([index, flights]) => {
      const currentIndex = parseInt(index);
      const nextIndex = currentIndex + 1;
      
      // Safety check for route indices
      if (nextIndex >= currentRoute.length) return null;
      
      const segmentRoute = `${currentRoute[currentIndex]}-${currentRoute[nextIndex]}`;
      return {
        index: currentIndex,
        route: segmentRoute,
        flights
      };
    }).filter(Boolean); // Remove any null entries
  };

  // Add pagination settings
  const paginationConfig = {
    pageSize: 5,
    showSizeChanger: true,
    showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} flights`,
    pageSizeOptions: ['5', '10', '20', '50'],
    position: ['bottomLeft']
  };

  return (
    <Modal
      title="Flight Details"
      open={isVisible}
      onCancel={handleCancel}
      footer={null}
      width={1600}
      styles={{
        body: { 
          padding: '12px',
          maxHeight: '90vh',
          overflow: 'auto'
        },
        content: {
          maxWidth: '100vw'
        }
      }}
    >
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: '8px', marginBottom: 16 }}>
          <div style={{ display: 'flex', gap: '8px', flex: 1 }}>
            <Input
              placeholder="Enter your yapping password (Under Development)"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              style={{ flex: 1 }}
            />
            <Button
              type="primary"
              disabled={!apiKey || !apiKey.toLowerCase().startsWith('pro')}
              onClick={() => handleCalendarSearch(currentRoute)}
            >
              Apply
            </Button>
          </div>
        </div>
        {dateRangeError && (
          <div style={{ color: 'red' }}>
            Please select a date range in the calendar
          </div>
        )}
      </div>

      <FlightAvailabilityCalendar 
        flightData={availabilityData}
        currentRoute={currentRoute}
        onDateRangeSelect={handleCalendarDateSelect}
        selectedRange={selectedDates}
        onSearch={handleCalendarSearchClick}
      />

      {isLoadingSegments ? (
        <div style={{ textAlign: 'center', margin: '20px 0' }}>
          <Spin />
        </div>
      ) : (
        segmentDetails?.length > 0 && (
          <div style={{ marginTop: 20 }}>
            <Typography.Title level={4} style={{ marginBottom: 16 }}>
              Flights By Segment
            </Typography.Title>
            {getSegmentTables().map((segment) => (
              <div key={segment.index} style={{ marginBottom: 24 }}>
                <Typography.Title level={5} style={{ marginBottom: 12 }}>
                  Segment {segment.index} ({segment.route}):
                </Typography.Title>
                <Table
                  columns={columns}
                  dataSource={segment.flights}
                  pagination={paginationConfig}
                  size="small"
                />
              </div>
            ))}
          </div>
        )
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