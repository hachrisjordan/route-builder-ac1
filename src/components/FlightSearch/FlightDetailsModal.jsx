import React, { useState, useEffect } from 'react';
import { Modal, DatePicker, Input, Spin, Table, Button, Typography, Pagination } from 'antd';
import dayjs from 'dayjs';
import { getSegmentColumns } from './segmentColumns';
import useFlightDetails from './hooks/useFlightDetails';
import FlightAvailabilityCalendar from './FlightAvailabilityCalendar';
import airlines from './data/airlines';
import { airports } from './data/airports';
import pricingData from './data/pricing.json';
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
    setStartDate,
    startDate,
  } = useFlightDetails(getSegmentColumns);

  // Add pagination state
  const [paginationState, setPaginationState] = useState({});
  
  // Add pagination config
  const paginationConfig = {
    pageSize: 5,
    showSizeChanger: true,
    pageSizeOptions: ['5', '10', '20', '50'],
  };

  // Function to handle pagination change
  const handlePaginationChange = (segmentIndex, page, pageSize) => {
    setPaginationState(prev => ({
      ...prev,
      [segmentIndex]: { page, pageSize }
    }));
  };

  // Function to get paginated data for a segment
  const getPaginatedData = (flights, segmentIndex) => {
    const { page = 1, pageSize = paginationConfig.pageSize } = paginationState[segmentIndex] || {};
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    return flights.slice(start, end);
  };

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

  const handleCalendarSearchClick = (startDate, endDate, stopoverInfo) => {
    if (!selectedDates) {
      setDateRangeError(true);
      return;
    }
    console.log('Modal passing stopover info:', JSON.stringify(stopoverInfo, null, 2));
    handleDateSearch(currentRoute, stopoverInfo);
  };

  // Function to group flights by segment with safety checks
  const getSegmentTables = () => {
    if (!segmentDetails || segmentDetails.length === 0) return [];

    // Group flights by segment and filter out hidden flights
    const segments = segmentDetails.reduce((acc, flight) => {
      if (flight.hidden) return acc; // Skip hidden flights
      
      if (!acc[flight.segmentIndex]) {
        acc[flight.segmentIndex] = {
          index: flight.segmentIndex,
          route: `${flight.from}-${flight.to}`,
          flights: []
        };
      }
      acc[flight.segmentIndex].flights.push(flight);
      return acc;
    }, {});

    return Object.values(segments);
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
            <DatePicker 
              placeholder="Calendar start on (optional)"
              onChange={(date) => setStartDate(date)}
              disabledDate={(current) => {
                // Disable dates before today and after 330 days from today
                const today = dayjs().startOf('day');
                const maxDate = today.add(330, 'days');
                return current && (current < today || current > maxDate);
              }}
              style={{ width: 200, marginLeft: 8 }}
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
          <div style={{ marginTop: 0 }}>
            <Typography.Title level={4} style={{ marginBottom: 16 }}>
              Flights By Segment
            </Typography.Title>
            {getSegmentTables().map((segment, index) => (
              <div key={segment.index} style={{ marginBottom: 16 }}>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  marginBottom: 12 
                }}>
                  <Typography.Title level={5} style={{ margin: 0 }}>
                    Segment {segment.index+1} ({segment.route}):
                  </Typography.Title>
                  <div>
                    <Pagination
                      size="small"
                      total={segment.flights.length}
                      pageSize={paginationState[segment.index]?.pageSize || paginationConfig.pageSize}
                      current={paginationState[segment.index]?.page || 1}
                      onChange={(page, pageSize) => handlePaginationChange(segment.index, page, pageSize)}
                      showSizeChanger={true}
                      showTotal={(total, range) => `${range[0]}-${range[1]} of ${total}`}
                      style={{ 
                        display: 'inline-block',
                        marginBottom: 0
                      }}
                    />
                  </div>
                </div>
                <Table
                  columns={columns}
                  dataSource={getPaginatedData(segment.flights, segment.index)}
                  pagination={false}
                  size="small"
                />
                
                {/* Add layover duration if there's a next segment and flights are selected */}
                {index < getSegmentTables().length - 1 && (
                  <div style={{ 
                    padding: '0px',
                    margin: '16px',
                    textAlign: 'center',
                    fontFamily: 'source-code-pro, Menlo, Monaco, Consolas, "Courier New", monospace'
                  }}>
                    <Typography.Text strong>
                      {(() => {
                        const currentSegmentFlights = selectedFlights[segment.index];
                        const nextSegmentFlights = selectedFlights[segment.index + 1];
                        
                        if (!currentSegmentFlights?.[0] || !nextSegmentFlights?.[0]) {
                          return 'Select flights to see connection time';
                        }

                        const currentFlight = currentSegmentFlights[0];
                        const nextFlight = nextSegmentFlights[0];
                        
                        const arrivalTime = dayjs(currentFlight.ArrivesAt);
                        const departureTime = dayjs(nextFlight.DepartsAt);
                        const layoverMinutes = departureTime.diff(arrivalTime, 'minute');
                        
                        // If layover is more than 24 hours, show as stopover
                        if (layoverMinutes >= 24 * 60) {
                          const days = Math.floor(layoverMinutes / (24 * 60));
                          const remainingHours = Math.floor((layoverMinutes % (24 * 60)) / 60);
                          const remainingMinutes = layoverMinutes % 60;
                          
                          return `Stopover duration: ${days} day${days > 1 ? 's' : ''} ${remainingHours}h ${remainingMinutes}m`;
                        } else {
                          // Regular layover display
                          const hours = Math.floor(layoverMinutes / 60);
                          const minutes = layoverMinutes % 60;
                          return `Layover duration: ${hours}h ${minutes}m`;
                        }
                      })()}
                    </Typography.Text>
                  </div>
                )}
              </div>
            ))}
          </div>
        )
      )}

      {/* Add Summary Table */}
      {Object.keys(selectedFlights).length > 0 && (
        <div style={{ marginTop: 24 }}>
          <Typography.Title level={4}>Journey Summary</Typography.Title>
          <Table
            columns={[
              {
                title: 'From',
                dataIndex: 'from',
                key: 'from',
              },
              {
                title: 'To',
                dataIndex: 'to',
                key: 'to',
              },
              {
                title: 'Airlines',
                dataIndex: 'airlines',
                key: 'airlines',
                render: (airlinesList) => {
                  // More thorough safety checks
                  if (!airlinesList || airlinesList === '-') return '-';
                  
                  try {
                    const airlineArray = Array.isArray(airlinesList) ? airlinesList : airlinesList.split(', ');
                    
                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {airlineArray.map((airlineName, index) => {
                          if (!airlineName) return null;
                          
                          const airline = airlines.find(a => 
                            airlineName.startsWith(a.label?.replace(` (${a.value})`, ''))
                          );
                          const airlineCode = airline?.value;
                          
                          return (
                            <div key={`${airlineCode}-${index}`} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              {airlineCode && (
                                <img 
                                  src={`${process.env.PUBLIC_URL}/${airlineCode}.png`}
                                  alt={airlineCode}
                                  style={{ 
                                    width: '24px', 
                                    height: '24px',
                                    objectFit: 'contain',
                                    borderRadius: '4px'
                                  }} 
                                  onError={(e) => {
                                    e.target.style.display = 'none';
                                  }}
                                />
                              )}
                              {airlineName}
                            </div>
                          );
                        })}
                      </div>
                    );
                  } catch (error) {
                    console.error('Error rendering airlines:', error);
                    return '-';
                  }
                },
              },
              {
                title: 'Duration',
                dataIndex: 'duration',
                key: 'duration',
              },
              {
                title: 'Departs',
                dataIndex: 'departs',
                key: 'departs',
              },
              {
                title: 'Arrives',
                dataIndex: 'arrives',
                key: 'arrives',
              },
              {
                title: 'Economy Price',
                dataIndex: 'economyPrice',
                key: 'economyPrice',
                onCell: (_, index) => ({
                  rowSpan: index === 0 ? 2 : 0, // Show only in first row
                }),
              },
              {
                title: 'Business Price (Max %)',
                dataIndex: 'businessPrice',
                key: 'businessPrice',
                onCell: (_, index) => ({
                  rowSpan: index === 0 ? 2 : 0, // Show only in first row
                }),
                render: (text) => {
                  if (!text || text === 'N/A') return text;
                  try {
                    const [price, percentage] = text.split(' (');
                    if (!percentage) return text;
                    return `${price} (${percentage}`;
                  } catch (error) {
                    return text;
                  }
                }
              },
              {
                title: 'First Price (Max %)',
                dataIndex: 'firstPrice',
                key: 'firstPrice',
                onCell: (_, index) => ({
                  rowSpan: index === 0 ? 2 : 0, // Show only in first row
                }),
                render: (text) => {
                  if (!text || text === 'N/A') return text;
                  try {
                    const [price, percentage] = text.split(' (');
                    if (!percentage) return text;
                    return `${price} (${percentage}`;
                  } catch (error) {
                    return text;
                  }
                }
              },
            ]}
            dataSource={(() => {
              try {
                const segments = Object.keys(selectedFlights).map(Number).sort((a, b) => a - b);
                if (segments.length === 0) return [];
                
                const firstSegmentIndex = Math.min(...segments);
                const lastSegmentIndex = Math.max(...segments);
                
                // Helper function to get airlines string
                const getAirlinesString = (segmentRange) => {
                  try {
                    const airlineSet = new Set(
                      segmentRange
                        .flatMap(i => selectedFlights[i]?.map(f => f.airlines))
                        .filter(Boolean)
                    );
                    return Array.from(airlineSet).join(', ') || '-';
                  } catch (error) {
                    console.error('Error getting airlines string:', error);
                    return '-';
                  }
                };

                // Debug logging
                console.log('Selected Flights:', selectedFlights);
                console.log('Segments:', segments);
                
                // Calculate prices for the ENTIRE journey (origin to final destination)
                const calculatePrices = (hasStopover) => {
                  try {
                    // Get origin and destination airports
                    const originAirport = airports.find(a => a.IATA === selectedFlights[firstSegmentIndex]?.[0]?.from);
                    const destAirport = airports.find(a => a.IATA === selectedFlights[lastSegmentIndex]?.[0]?.to);
                    
                    if (!originAirport || !destAirport) return {
                      economyPrice: '-',
                      businessPrice: '-',
                      firstPrice: '-'
                    };

                    // Calculate total distance and cabin class distances
                    let totalDistance = 0;
                    let businessDistance = 0;
                    let firstDistance = 0;
                    let businessOnlyDistance = 0;  // New: for segments with only business (no first)

                    Object.entries(selectedFlights).forEach(([_, flights]) => {
                      flights.forEach(flight => {
                        const distance = parseInt(flight.distance || 0);
                        totalDistance += distance;
                        
                        // For Business Price: Include all segments with business class
                        if (flight.business) businessDistance += distance;
                        
                        // For First Price: Only count business from segments without first
                        if (flight.business && !flight.first) businessOnlyDistance += distance;
                        if (flight.first) firstDistance += distance;
                      });
                    });

                    // Find matching price in pricing data
                    const pricing = pricingData.find(p => 
                      p["From Region"] === originAirport.Zone &&
                      p["To Region"] === destAirport.Zone &&
                      totalDistance >= p["Min Distance"] &&
                      totalDistance <= p["Max Distance"]
                    );

                    if (!pricing) return {
                      economyPrice: '-',
                      businessPrice: '-',
                      firstPrice: '-'
                    };

                    // Calculate percentages
                    const businessPercentage = Math.round((businessDistance / totalDistance) * 100);
                    const firstPercentage = Math.round((firstDistance / totalDistance) * 100);
                    const businessOnlyPercentage = Math.round((businessOnlyDistance / totalDistance) * 100);

                    // Add stopover fee if applicable
                    const stopoverExtra = hasStopover ? 5000 : 0;

                    return {
                      economyPrice: pricing.Economy ? (pricing.Economy + stopoverExtra).toLocaleString() : '-',
                      businessPrice: pricing.Business ? 
                        `${(pricing.Business + stopoverExtra).toLocaleString()} (${businessPercentage}% J)` : '-',
                      firstPrice: pricing.First && firstPercentage > 0 ? 
                        `${(pricing.First + stopoverExtra).toLocaleString()} (${
                          firstPercentage > 0 && businessOnlyPercentage > 0 
                            ? `${firstPercentage}% F, ${businessOnlyPercentage}% J`
                            : firstPercentage > 0 
                              ? `${firstPercentage}% F`
                              : '0%'
                        })` : '-'
                    };
                  } catch (error) {
                    console.error('Error calculating prices:', error);
                    return {
                      economyPrice: '-',
                      businessPrice: '-',
                      firstPrice: '-'
                    };
                  }
                };

                // Find stopover point
                let stopoverIndex = null;
                for (let i = firstSegmentIndex; i < lastSegmentIndex; i++) {
                  const currentFlight = selectedFlights[i]?.[0];
                  const nextFlight = selectedFlights[i + 1]?.[0];
                  
                  if (currentFlight && nextFlight) {
                    const arrivalTime = dayjs(currentFlight.ArrivesAt);
                    const departureTime = dayjs(nextFlight.DepartsAt);
                    const layoverMinutes = departureTime.diff(arrivalTime, 'minute');
                    
                    if (layoverMinutes >= 24 * 60) {
                      stopoverIndex = i;
                      break;
                    }
                  }
                }

                // Calculate prices once for the entire journey
                const prices = calculatePrices(stopoverIndex !== null);

                // If no stopover found, return single row
                if (stopoverIndex === null) {
                  return [{
                    key: '1',
                    from: selectedFlights[firstSegmentIndex]?.[0]?.from || '-',
                    to: selectedFlights[lastSegmentIndex]?.[0]?.to || '-',
                    airlines: getAirlinesString(segments),
                    duration: (() => {
                      const firstDeparture = dayjs(selectedFlights[firstSegmentIndex]?.[0]?.DepartsAt);
                      const finalArrival = dayjs(selectedFlights[lastSegmentIndex]?.[0]?.ArrivesAt);
                      const minutes = finalArrival.diff(firstDeparture, 'minute');
                      const hours = Math.floor(minutes / 60);
                      const remainingMinutes = minutes % 60;
                      return `${hours}h ${remainingMinutes}m`;
                    })(),
                    departs: dayjs(selectedFlights[firstSegmentIndex]?.[0]?.DepartsAt).format('HH:mm MM-DD'),
                    arrives: dayjs(selectedFlights[lastSegmentIndex]?.[0]?.ArrivesAt).format('HH:mm MM-DD'),
                    ...prices
                  }];
                }

                // Split journey at stopover with merged price cells
                return [
                  {
                    key: '1',
                    from: selectedFlights[firstSegmentIndex]?.[0]?.from || '-',
                    to: selectedFlights[stopoverIndex]?.[0]?.to || '-',
                    airlines: getAirlinesString(segments.filter(i => i <= stopoverIndex)),
                    duration: (() => {
                      const firstDeparture = dayjs(selectedFlights[firstSegmentIndex]?.[0]?.DepartsAt);
                      const stopoverArrival = dayjs(selectedFlights[stopoverIndex]?.[0]?.ArrivesAt);
                      const minutes = stopoverArrival.diff(firstDeparture, 'minute');
                      const hours = Math.floor(minutes / 60);
                      const remainingMinutes = minutes % 60;
                      return `${hours}h ${remainingMinutes}m`;
                    })(),
                    departs: dayjs(selectedFlights[firstSegmentIndex]?.[0]?.DepartsAt).format('HH:mm MM-DD'),
                    arrives: dayjs(selectedFlights[stopoverIndex]?.[0]?.ArrivesAt).format('HH:mm MM-DD'),
                    ...prices  // Same prices for first row
                  },
                  {
                    key: '2',
                    from: selectedFlights[stopoverIndex + 1]?.[0]?.from || '-',
                    to: selectedFlights[lastSegmentIndex]?.[0]?.to || '-',
                    airlines: getAirlinesString(segments.filter(i => i > stopoverIndex)),
                    duration: (() => {
                      const stopoverDeparture = dayjs(selectedFlights[stopoverIndex + 1]?.[0]?.DepartsAt);
                      const finalArrival = dayjs(selectedFlights[lastSegmentIndex]?.[0]?.ArrivesAt);
                      const minutes = finalArrival.diff(stopoverDeparture, 'minute');
                      const hours = Math.floor(minutes / 60);
                      const remainingMinutes = minutes % 60;
                      return `${hours}h ${remainingMinutes}m`;
                    })(),
                    departs: dayjs(selectedFlights[stopoverIndex + 1]?.[0]?.DepartsAt).format('HH:mm MM-DD'),
                    arrives: dayjs(selectedFlights[lastSegmentIndex]?.[0]?.ArrivesAt).format('HH:mm MM-DD'),
                    economyPrice: null,  // Will be hidden by rowSpan
                    businessPrice: null, // Will be hidden by rowSpan
                    firstPrice: null     // Will be hidden by rowSpan
                  }
                ];
              } catch (error) {
                console.error('Error generating dataSource:', error);
                return [];
              }
            })()}
            pagination={false}
            size="small"
          />
          
          {/* Add Route Validation */}
          <div style={{ marginTop: 12, fontFamily: 'source-code-pro, Menlo, Monaco, Consolas, "Courier New", monospace' }}>
            <Typography.Text>
              {(() => {
                const firstSegmentIndex = Math.min(...Object.keys(selectedFlights).map(Number));
                const lastSegmentIndex = Math.max(...Object.keys(selectedFlights).map(Number));
                const originAirport = airports.find(a => a.IATA === selectedFlights[firstSegmentIndex]?.[0]?.from);
                const destAirport = airports.find(a => a.IATA === selectedFlights[lastSegmentIndex]?.[0]?.to);

                if (!originAirport || !destAirport) return 'Unable to validate route: airport data missing';

                // Haversine formula
                const R = 3959; // Earth's radius in miles
                const lat1 = originAirport.Latitude * Math.PI / 180;
                const lat2 = destAirport.Latitude * Math.PI / 180;
                const dLat = (destAirport.Latitude - originAirport.Latitude) * Math.PI / 180;
                const dLon = (destAirport.Longitude - originAirport.Longitude) * Math.PI / 180;

                const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                          Math.cos(lat1) * Math.cos(lat2) *
                          Math.sin(dLon/2) * Math.sin(dLon/2);
                
                const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
                const directDistance = Math.round(R * c);

                // Calculate total segment distance
                let totalSegmentDistance = 0;
                Object.values(selectedFlights).forEach(flights => {
                  flights.forEach(flight => {
                    totalSegmentDistance += parseInt(flight.distance || 0);
                  });
                });

                const isValid = totalSegmentDistance <= (2 * directDistance);
                const percentage = Math.round(totalSegmentDistance/directDistance * 100);

                return (
                  <>
                    <div style={{ 
                      marginTop: 8,
                      fontSize: '16px',
                      fontWeight: 'bold',
                      color: isValid ? '#52c41a' : '#f5222d',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      width: '100%'
                    }}>
                      {isValid ? (
                        <>
                          <span>✓</span>
                          <span>ROUTING VALIDATED</span>
                        </>
                      ) : (
                        <>
                          <span>✗</span>
                          <span>THIS ROUTING IS INVALID</span>
                        </>
                      )}
                    </div>
                  </>
                );
              })()}
            </Typography.Text>
          </div>
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