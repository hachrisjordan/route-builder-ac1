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
                    {/* Pagination controls */}
                    <Pagination
                      size="small"
                      total={segment.flights.length}
                      pageSize={paginationConfig.pageSize}
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
                  dataSource={segment.flights}
                  pagination={false} // Remove pagination from table
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
                render: () => {
                  const firstSegmentIndex = Math.min(...Object.keys(selectedFlights).map(Number));
                  const firstFlight = selectedFlights[firstSegmentIndex]?.[0];
                  return firstFlight?.from || '-';
                }
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
                render: (airlinesList) => (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {airlinesList.split(', ').map(airlineName => {
                      const airline = airlines.find(a => airlineName.startsWith(a.label.replace(` (${a.value})`, '')));
                      const airlineCode = airline?.value;
                      return (
                        <div key={airlineCode} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
                          {airlineName}
                        </div>
                      );
                    })}
                  </div>
                ),
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
              },
              {
                title: 'Business Price (Max %)',
                dataIndex: 'businessPrice',
                key: 'businessPrice',
                render: (text, record) => {
                  if (text === 'N/A') return text;
                  const [price, percentage] = text.split(' (');
                  if (!percentage) return text;
                  return `${price} (${percentage}`;
                }
              },
              {
                title: 'First Price (Max %)',
                dataIndex: 'firstPrice',
                key: 'firstPrice',
                render: (text, record) => {
                  if (text === 'N/A') return text;
                  const [price, percentage] = text.split(' (');
                  if (!percentage) return text;
                  return `${price} (${percentage}`;
                }
              },
            ]}
            dataSource={[{
              key: '1',
              from: (() => {
                const firstSegmentIndex = Math.min(...Object.keys(selectedFlights).map(Number));
                const firstFlight = selectedFlights[firstSegmentIndex]?.[0];
                return firstFlight?.from || '-';
              })(),
              to: (() => {
                const lastSegmentIndex = Math.max(...Object.keys(selectedFlights).map(Number));
                const lastFlight = selectedFlights[lastSegmentIndex]?.[0];
                return lastFlight?.to || '-';
              })(),
              airlines: [...new Set(Object.values(selectedFlights).flatMap(flights => 
                flights.map(f => f.airlines)
              ))].join(', '),
              duration: (() => {
                let totalMinutes = 0;
                const segments = Object.keys(selectedFlights).sort((a, b) => parseInt(a) - parseInt(b));
                
                segments.forEach(segmentIndex => {
                  const flight = selectedFlights[segmentIndex][0];
                  totalMinutes += parseInt(flight.duration);
                  
                  const nextSegmentIndex = (parseInt(segmentIndex) + 1).toString();
                  if (selectedFlights[nextSegmentIndex]) {
                    const currentFlight = selectedFlights[segmentIndex][0];
                    const nextFlight = selectedFlights[nextSegmentIndex][0];
                    
                    const arrivalTime = dayjs(currentFlight.ArrivesAt);
                    const departureTime = dayjs(nextFlight.DepartsAt);
                    const layoverMinutes = departureTime.diff(arrivalTime, 'minute');
                    
                    totalMinutes += layoverMinutes;
                  }
                });
                
                const hours = Math.floor(totalMinutes / 60);
                const minutes = totalMinutes % 60;
                return `${hours}h ${minutes}m`;
              })(),
              departs: dayjs(selectedFlights[0]?.[0]?.DepartsAt).format('HH:mm MM-DD'),
              arrives: dayjs(selectedFlights[Object.keys(selectedFlights).length - 1]?.[0]?.ArrivesAt).format('HH:mm MM-DD'),
              economyPrice: (() => {
                // Get origin and destination airports
                const originAirport = airports.find(a => a.IATA === selectedFlights[0]?.[0]?.from);
                const destAirport = airports.find(a => a.IATA === selectedFlights[Object.keys(selectedFlights).length - 1]?.[0]?.to);
                
                if (!originAirport || !destAirport) return '-';

                // Calculate total distance
                let totalDistance = 0;
                Object.values(selectedFlights).forEach(flights => {
                  flights.forEach(flight => {
                    totalDistance += parseInt(flight.distance || 0);
                  });
                });

                // Find matching price in pricing data
                const pricing = pricingData.find(p => 
                  p["From Region"] === originAirport.Zone &&
                  p["To Region"] === destAirport.Zone &&
                  totalDistance >= p["Min Distance"] &&
                  totalDistance <= p["Max Distance"]
                );

                return pricing ? pricing.Economy.toLocaleString() : '-';
              })(),
              businessPrice: (() => {
                const firstSegmentIndex = Math.min(...Object.keys(selectedFlights).map(Number));
                const lastSegmentIndex = Math.max(...Object.keys(selectedFlights).map(Number));
                const originAirport = airports.find(a => a.IATA === selectedFlights[firstSegmentIndex]?.[0]?.from);
                const destAirport = airports.find(a => a.IATA === selectedFlights[lastSegmentIndex]?.[0]?.to);
                
                if (!originAirport || !destAirport) return '-';

                let totalDistance = 0;
                let businessDistance = 0;

                Object.entries(selectedFlights).forEach(([index, flights]) => {
                  flights.forEach(flight => {
                    const distance = parseInt(flight.distance || 0);
                    totalDistance += distance;
                    if (flight.business) businessDistance += distance;
                  });
                });

                const businessPercentage = Math.round((businessDistance / totalDistance) * 100);

                const pricing = pricingData.find(p => 
                  p["From Region"] === originAirport.Zone &&
                  p["To Region"] === destAirport.Zone &&
                  totalDistance >= p["Min Distance"] &&
                  totalDistance <= p["Max Distance"]
                );

                if (!pricing || !pricing.Business) return '-';
                return `${pricing.Business.toLocaleString()} (${businessPercentage}% J)`;
              })(),
              firstPrice: (() => {
                const firstSegmentIndex = Math.min(...Object.keys(selectedFlights).map(Number));
                const lastSegmentIndex = Math.max(...Object.keys(selectedFlights).map(Number));
                const originAirport = airports.find(a => a.IATA === selectedFlights[firstSegmentIndex]?.[0]?.from);
                const destAirport = airports.find(a => a.IATA === selectedFlights[lastSegmentIndex]?.[0]?.to);
                
                if (!originAirport || !destAirport) return '-';

                let totalDistance = 0;
                let businessDistance = 0;
                let firstDistance = 0;

                Object.entries(selectedFlights).forEach(([index, flights]) => {
                  flights.forEach(flight => {
                    const distance = parseInt(flight.distance || 0);
                    totalDistance += distance;
                    if (flight.business && !flight.first) businessDistance += distance;
                    if (flight.first) firstDistance += distance;
                  });
                });

                const businessPercentage = Math.round((businessDistance / totalDistance) * 100);
                const firstPercentage = Math.round((firstDistance / totalDistance) * 100);

                const pricing = pricingData.find(p => 
                  p["From Region"] === originAirport.Zone &&
                  p["To Region"] === destAirport.Zone &&
                  totalDistance >= p["Min Distance"] &&
                  totalDistance <= p["Max Distance"]
                );

                // Return '-' if there are no First Class segments or no pricing data
                if (!pricing || !pricing.First || firstPercentage === 0) return '-';

                let percentageText = '';
                if (businessPercentage > 0 && firstPercentage > 0) {
                  percentageText = `${firstPercentage}% F, ${businessPercentage}% J)`;
                } else if (firstPercentage > 0) {
                  percentageText = `${firstPercentage}% F)`;
                } else {
                  percentageText = '0%)';
                }

                return `${pricing.First.toLocaleString()} (${percentageText}`;
              })(),
            }]}
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