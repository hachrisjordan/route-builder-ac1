import React, { useState, useEffect } from 'react';
import { Button, Card, Typography, Badge, Select, InputNumber } from 'antd';
import dayjs from 'dayjs';
import { airports } from './data/airports';
import FlightDetailsModal from './FlightDetailsModal';

const { Title } = Typography;

const FlightAvailabilityCalendar = ({ flightData, currentRoute, onDateRangeSelect, selectedRange, onSearch, selectedFlights, pricingData }) => {
  const [currentMonth, setCurrentMonth] = useState(dayjs().month());
  const [currentYear, setCurrentYear] = useState(dayjs().year());
  const [selectionStart, setSelectionStart] = useState(null);
  const [selectionEnd, setSelectionEnd] = useState(null);
  const [error, setError] = useState('');
  const [showCalendar, setShowCalendar] = useState(false);
  const [selectedConnection, setSelectedConnection] = useState(null);
  const [stopoverDays, setStopoverDays] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Get days in month
  const getDaysInMonth = (year, month) => {
    return dayjs(`${year}-${month + 1}`).daysInMonth();
  };

  // Get first day of month (0 = Sunday, 1 = Monday, etc.)
  const getFirstDayOfMonth = (year, month) => {
    return dayjs(`${year}-${month + 1}-01`).day();
  };

  // Helper to format date as "YYYY-MM-DD"
  const formatDate = (year, month, day) => {
    return dayjs(`${year}-${month + 1}-${day}`).format('YYYY-MM-DD');
  };

  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDayOfMonth = getFirstDayOfMonth(currentYear, currentMonth);

  // Previous and next month handlers
  const goToPrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const goToNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const monthNames = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"];
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  // Function to render availability badges
  const renderAvailabilityBadges = (route, classes) => {
    // Helper function to get background color based on class code
    const getBackgroundColor = (classCode, available) => {
      if (!available) return 'transparent';
      switch (classCode) {
        case 'Y': return '#E8E1F2';
        case 'J': return '#F3CD87';
        case 'F': return '#D88A3F';
        default: return 'transparent';
      }
    };

    return (
      <div style={{ display: 'flex', gap: '2px' }}>
        {Object.entries(classes).map(([classCode, available]) => (
          <div
            key={classCode}
            style={{
              backgroundColor: getBackgroundColor(classCode, available),
              color: available ? '#684634' : '#999',
              padding: '0px 4px',
              borderRadius: '4px',
              fontSize: '13px',
              fontFamily: 'Menlo',
              width: '20px',
              textAlign: 'center'
            }}
          >
            {available ? classCode : '-'}
          </div>
        ))}
      </div>
    );
  };

  // Function to check if a segment is valid for the current route
  const isValidSegment = (segment) => {
    const [from, to] = segment.route.split('-');
    
    // Check if this segment exists as consecutive airports in currentRoute
    for (let i = 0; i < currentRoute.length - 1; i++) {
      if (currentRoute[i] === from && currentRoute[i + 1] === to) {
        return { isValid: true, index: i };
      }
    }
    return { isValid: false, index: -1 };
  };

  // Function to get all required segments for a date
  const getRequiredSegments = (existingSegments) => {
    // Create a map of existing segments for easy lookup
    const segmentMap = new Map(
      existingSegments.map(segment => [segment.route, segment])
    );

    // Generate all required segments
    const allSegments = [];
    for (let i = 0; i < currentRoute.length - 1; i++) {
      const route = `${currentRoute[i]}-${currentRoute[i + 1]}`;
      const segment = segmentMap.get(route) || {
        route,
        classes: { Y: false, J: false, F: false }, // Default to all unavailable
        index: i
      };
      allSegments.push(segment);
    }

    return allSegments.sort((a, b) => a.index - b.index);
  };

  // Function to sort segments by their position in the route
  const sortSegments = (segments) => {
    const validSegments = segments
      .map(segment => ({
        ...segment,
        ...isValidSegment(segment)
      }))
      .filter(segment => segment.isValid);

    return getRequiredSegments(validSegments);
  };

  // Add function to check if any segment has availability
  const hasAnyAvailability = (segments) => {
    return segments.some(segment => 
      segment.classes.Y || segment.classes.J || segment.classes.F
    );
  };

  const handleDateClick = (dateString) => {
    if (!selectionStart) {
      // First click - set start date
      setSelectionStart(dateString);
      setSelectionEnd(null);
      setError('');
    } else if (!selectionEnd) {
      // Second click - set end date
      const start = dayjs(selectionStart);
      const end = dayjs(dateString);
      
      if (end.isBefore(start)) {
        // If end date is before start date, make it the new start date
        setSelectionStart(dateString);
        setSelectionEnd(null);
        setError('');
      } else if (end.diff(start, 'days') > 7) {
        setError('Date range cannot exceed 7 days');
        return;
      } else {
        // Normal case - end date is after start date
        setSelectionEnd(dateString);
        onDateRangeSelect([start, end]);
      }
    } else {
      // Third click - reset and set new start date
      setSelectionStart(dateString);
      setSelectionEnd(null);
      setError('');
    }
  };

  const isDateInRange = (dateString) => {
    if (!selectionStart || !selectionEnd) return false;
    const date = dayjs(dateString);
    const start = dayjs(selectionStart);
    const end = dayjs(selectionEnd);
    return date.isAfter(start.subtract(1, 'day')) && 
           date.isBefore(end.add(1, 'day'));
  };

  // Add a function to handle the Apply button click
  const handleApplyClick = (stopoverInfo, preserveCalendarData = false, clearSelections = false) => {
    // Make sure the calendar is visible
    setShowCalendar(true);
    
    // If there are selected dates, move to the month of the first selected date
    if (selectedRange && selectedRange[0]) {
      const selectedDate = dayjs.isDayjs(selectedRange[0]) 
        ? selectedRange[0] 
        : dayjs(selectedRange[0]);
      
      // Set the current month and year
      setCurrentMonth(selectedDate.month());
      setCurrentYear(selectedDate.year());
      
      console.log('Moving calendar to:', selectedDate.format('YYYY-MM-DD'));
      console.log('Month:', selectedDate.month(), 'Year:', selectedDate.year());
    }
    
    // Call the original onSearch function
    onSearch(stopoverInfo, preserveCalendarData, clearSelections);
  };

  // Get unique connection points from currentRoute with full airport names
  const connectionOptions = currentRoute
    .slice(1, -1)
    .map(iata => {
      const airport = airports.find(a => a.IATA === iata);
      return {
        label: airport ? `${airport.IATA} - ${airport.Name}` : iata,
        value: iata
      };
    });

  // Add this function to directly set the calendar to a specific month/year
  const setCalendarToDate = (date) => {
    if (!date) return;
    
    // Ensure we have a dayjs object
    const dayjsDate = dayjs.isDayjs(date) ? date : dayjs(date);
    
    // Log for debugging
    console.log('Setting calendar to date:', dayjsDate.format('YYYY-MM-DD'));
    console.log('Month:', dayjsDate.month(), 'Year:', dayjsDate.year());
    
    // Force update the calendar view
    setCurrentMonth(dayjsDate.month());
    setCurrentYear(dayjsDate.year());
  };

  // Update the useEffect to use our new function
  useEffect(() => {
    if (selectedRange && selectedRange[0]) {
      const selectedDate = dayjs.isDayjs(selectedRange[0]) 
        ? selectedRange[0] 
        : dayjs(selectedRange[0]);
      
      setCurrentMonth(selectedDate.month());
      setCurrentYear(selectedDate.year());
      
      // Make sure the calendar is visible
      setShowCalendar(true);
    }
  }, [selectedRange]);

  // Function to handle search button click
  const handleSearch = (stopoverInfo = null, preserveCalendarData = false, clearSelections = false) => {
    if (!selectionStart || !selectionEnd) {
      setError('Please select a date range');
      return;
    }
    
    if (selectedConnection && !stopoverDays) {
      setError('Please specify stopover days');
      return;
    }
    
    setError('');
    
    // Create stopover info object if a connection is selected
    const stopoverInfoObj = selectedConnection ? {
      airport: selectedConnection,
      days: stopoverDays
    } : stopoverInfo;
    
    // Call the onSearch function with the date range and stopover info
    if (onSearch) {
      console.log("Calling onSearch with:", [selectionStart, selectionEnd], stopoverInfoObj);
      onSearch([selectionStart, selectionEnd], stopoverInfoObj, preserveCalendarData, clearSelections);
    }
  };

  // Add an effect to handle when the component receives new data
  useEffect(() => {
    if (flightData && flightData.length > 0) {
      // Find the first date with data
      const firstDateWithData = Object.keys(flightData[0]?.dates || {})
        .sort()
        .find(date => flightData[0].dates[date]?.length > 0);
        
      if (firstDateWithData) {
        setCalendarToDate(firstDateWithData);
      }
    }
  }, [flightData]);

  // Clear function to reset stopover selections
  const clearStopoverSelections = () => {
    setSelectedConnection(null);
    setStopoverDays(null);
  };

  // Handle modal close
  const handleModalClose = () => {
    setIsModalOpen(false);
    clearStopoverSelections();
  };

  // Add a function to clear stopover information
  const clearStopoverInfo = () => {
    setSelectedConnection(null);
    setStopoverDays(null);
  };
  
  // Add a function to hide the calendar
  const hideCalendar = () => {
    setShowCalendar(false);
    setSelectionStart(null);
    setSelectionEnd(null);
    setError('');
  };
  
  // Expose the functions globally
  useEffect(() => {
    window.clearStopoverInfo = clearStopoverInfo;
    window.hideCalendar = hideCalendar;
    
    // Cleanup on unmount
    return () => {
      delete window.clearStopoverInfo;
      delete window.hideCalendar;
    };
  }, []);

  return (
    <div>
      {!showCalendar && (
        <Button onClick={() => handleApplyClick()}>
          Show Calendar
        </Button>
      )}
      
      {showCalendar && (
        <div style={{ padding: '20px' }}>
          {/* Calendar header */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            marginBottom: '20px' 
          }}>
            <Button 
              type="primary"
              onClick={goToPrevMonth}
              style={{ backgroundColor: '#1677ff' }}
            >
              &larr;
            </Button>
            <Title level={4} style={{ margin: 0 }}>{monthNames[currentMonth]} {currentYear}</Title>
            <Button 
              type="primary"
              onClick={goToNextMonth}
              style={{ backgroundColor: '#1677ff' }}
            >
              &rarr;
            </Button>
          </div>

          {/* Calendar grid */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(7, 1fr)',
            border: '1px solid #f0f0f0',
            backgroundColor: '#f0f0f0',
            gap: '1px',
            fontFamily: 'Menlo, monospace'
          }}>
            {/* Day headers */}
            {dayNames.map(day => (
              <div key={day} style={{ 
                backgroundColor: '#f5f5f5',
                padding: '8px',
                textAlign: 'center',
                fontWeight: '500'
              }}>
                {day}
              </div>
            ))}

            {/* Calendar cells */}
            {Array.from({ length: firstDayOfMonth }).map((_, index) => (
              <div key={`empty-${index}`} style={{ 
                backgroundColor: 'white',
                minHeight: '120px',
                padding: '8px'
              }} />
            ))}

            {Array.from({ length: daysInMonth }).map((_, index) => {
              const day = index + 1;
              const dateString = formatDate(currentYear, currentMonth, day);
              const flights = flightData[dateString] || [];
              const validFlights = flights.length > 0 ? sortSegments(flights) : [];
              const showFlights = validFlights.length > 0 && hasAnyAvailability(validFlights);
              const isSelected = isDateInRange(dateString);
              const isStart = dateString === selectionStart;
              const isEnd = dateString === selectionEnd;

              return (
                <div
                  key={`day-${day}`}
                  style={{
                    backgroundColor: isSelected ? '#e6f4ff' : 'white',
                    minHeight: '120px',
                    padding: '8px',
                    fontFamily: 'Menlo, monospace',
                    cursor: 'pointer',
                    border: isStart || isEnd ? '2px solid #1890ff' : 'none'
                  }}
                  onClick={() => handleDateClick(dateString)}
                >
                  <div style={{ 
                    fontWeight: 'bold', 
                    marginBottom: '8px',
                    fontSize: '13px'
                  }}>
                    {day}
                  </div>
                  {showFlights ? (
                    <div style={{ fontSize: '12px' }}>
                      {validFlights.map((segment, idx) => (
                        <div 
                          key={idx} 
                          style={{ 
                            marginBottom: '4px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                          }}
                        >
                          <div style={{ 
                            fontSize: '14px',
                            fontFamily: 'Menlo, monospace'
                          }}>
                            {segment.route}
                          </div>
                          {renderAvailabilityBadges(segment.route, segment.classes)}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ 
                      textAlign: 'center', 
                      color: '#999', 
                      fontSize: '12px',
                      marginTop: '32px',
                      fontFamily: 'Menlo, monospace'
                    }}>
                      No flights
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {error && (
            <div style={{ 
              color: '#ff4d4f', 
              marginTop: '16px',
              textAlign: 'center' 
            }}>
              {error}
            </div>
          )}

          <div style={{ 
            marginTop: '16px',
            display: 'flex',
            justifyContent: 'flex-start',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '8px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>Stopover at</span>
              <Select
                style={{ width: 400 }}
                value={selectedConnection}
                onChange={(value) => {
                  setSelectedConnection(value);
                  if (!value) {
                    setStopoverDays(null);
                  }
                }}
                options={connectionOptions}
                allowClear
                placeholder="Select city"
              />
              {selectedConnection && (
                <>
                  <span>for</span>
                  <InputNumber
                    style={{ width: 60 }}
                    min={1}
                    max={14}
                    value={stopoverDays}
                    onChange={(value) => setStopoverDays(value)}
                    placeholder="Days"
                  />
                  <span>days</span>
                </>
              )}
            </div>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
              <Button
                type="primary"
                onClick={() => {
                  console.log("FlightAvailabilityCalendar Search button clicked");
                  
                  // Create stopover info if needed
                  const stopoverInfo = selectedConnection ? {
                    airport: selectedConnection,
                    days: stopoverDays
                  } : null;
                  
                  // Call the handleSearch function with the stopover info
                  handleSearch(stopoverInfo);
                }}
                disabled={!selectionStart || !selectionEnd || (selectedConnection && !stopoverDays)}
              >
                Search
              </Button>
              <Button
                onClick={() => setShowCalendar(false)}
              >
                Hide Calendar
              </Button>
            </div>
          </div>
        </div>
      )}

      <FlightDetailsModal
        isModalOpen={isModalOpen}
        onClose={handleModalClose}
        selectedFlights={selectedFlights}
        pricingData={pricingData}
        currentRoute={currentRoute}
      />
    </div>
  );
};

export default FlightAvailabilityCalendar; 