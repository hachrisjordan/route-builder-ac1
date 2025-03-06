import React, { useState, useEffect, useRef } from 'react';
import { Button, Typography, Select, InputNumber } from 'antd';
import dayjs from 'dayjs';
import { airports } from './data/airports';
import FlightDetailsModal from './FlightDetailsModal';

const { Title } = Typography;

const FlightAvailabilityCalendar = ({ flightData, currentRoute, onDateRangeSelect, selectedRange, onSearch, selectedFlights, pricingData }) => {
  // State initialization
  const [currentMonth, setCurrentMonth] = useState(dayjs().month());
  const [currentYear, setCurrentYear] = useState(dayjs().year());
  // Create a local state for selections that won't be reset by props changes
  const [localSelectionStart, setLocalSelectionStart] = useState(null);
  const [localSelectionEnd, setLocalSelectionEnd] = useState(null);
  const [error, setError] = useState('');
  // Hard-code showCalendar to true to prevent infinite loops
  const showCalendar = true;
  const [selectedConnection, setSelectedConnection] = useState(null);
  const [stopoverDays, setStopoverDays] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Create derived values for selection that can be used in the component
  // This ensures local state takes precedence but will fall back to props if local state is null
  const selectionStart = localSelectionStart;
  const selectionEnd = localSelectionEnd;
  
  // Track selection changes with a ref to prevent race conditions
  const selectionRef = useRef({ start: null, end: null });
  
  // Set up display control functions
  const hideCalendarFn = () => {
    // We want to reset selections but not actually hide the calendar
    setLocalSelectionStart(null);
    setLocalSelectionEnd(null);
    setError('');
    
    // Reset the ref so the calendar can be shown again if needed
    if (calendarShownRef) {
      calendarShownRef.current = false;
    }
    
    // Also reset the selection ref
    selectionRef.current = { start: null, end: null };
  };
  
  const clearStopoverInfo = () => {
    // Clear stopover information
    setSelectedConnection(null);
    setStopoverDays(null);
    
    // Also clear date selections
    setLocalSelectionStart(null);
    setLocalSelectionEnd(null);
    
    // Reset the selection ref
    if (selectionRef && selectionRef.current) {
      selectionRef.current = { start: null, end: null };
    }
    
    // Clear error message
    setError('');
    
    console.log("All selections cleared");
  };

  // Use a ref to prevent infinite loops from repeated function calls
  const calendarShownRef = useRef(false);
  
  // DISABLE ALL USEEFFECTS TO STOP LOOPS
  /*
  useEffect(() => {
    window.showCalendar = () => {
      console.log("Window showCalendar called");
      if (!calendarShownRef.current) {
        calendarShownRef.current = true;
        setShowCalendar(true);
        console.log("Calendar visibility set to true");
      }
    };
    
    window.hideCalendar = hideCalendarFn;
    window.clearStopoverInfo = clearStopoverInfo;
    
    setShowCalendar(true);
    
    return () => {
      delete window.showCalendar;
      delete window.hideCalendar;
      delete window.clearStopoverInfo;
    };
  }, []);
  */
  
  // Set up the window functions directly without useEffect
  window.showCalendar = () => {
    const calendarContainer = document.querySelector(".calendar-container");
    if (calendarContainer) {
      calendarContainer.style.display = "block";
    }
    console.log("Calendar shown via DOM manipulation");
  };
  
  window.hideCalendar = () => {
    const calendarContainer = document.querySelector(".calendar-container");
    if (calendarContainer) {
      calendarContainer.style.display = "none";
    }
    console.log("Calendar hidden via DOM manipulation");
  };
  
  // This one needs to actually work to clear selections when the modal closes
  window.clearStopoverInfo = clearStopoverInfo;
  
  // REMOVING THIS ENTIRE EFFECT TO STOP INFINITE LOOP
  // We'll manually initialize selections when needed

  // Calendar navigation functions
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

  // Calendar utility functions
  const getDaysInMonth = (year, month) => {
    return dayjs(`${year}-${month + 1}`).daysInMonth();
  };

  const getFirstDayOfMonth = (year, month) => {
    return dayjs(`${year}-${month + 1}-01`).day();
  };

  const formatDate = (year, month, day) => {
    return dayjs(`${year}-${month + 1}-${day}`).format('YYYY-MM-DD');
  };

  // Date selection handling with stable state
  const handleDateClick = (dateString) => {
    console.log("Date clicked:", dateString);
    console.log("Current selection:", { 
      start: selectionRef.current.start, 
      end: selectionRef.current.end 
    });
    
    if (!selectionRef.current.start) {
      console.log("Setting selection start");
      // Update both the ref and state
      selectionRef.current.start = dateString;
      selectionRef.current.end = null;
      
      setLocalSelectionStart(dateString);
      setLocalSelectionEnd(null);
      setError('');
    } else if (!selectionRef.current.end) {
      console.log("Setting selection end");
      const start = dayjs(selectionRef.current.start);
      const end = dayjs(dateString);
      
      if (end.isBefore(start)) {
        setError('End date cannot be before start date');
        return;
      }
      
      if (end.diff(start, 'days') > 7) {
        setError('Date range cannot exceed 7 days');
        return;
      }

      // Update both the ref and state
      selectionRef.current.end = dateString;
      setLocalSelectionEnd(dateString);
      
      if (onDateRangeSelect) {
        onDateRangeSelect([start, end]);
      }
    } else {
      console.log("Resetting selection");
      // Update both the ref and state
      selectionRef.current.start = dateString;
      selectionRef.current.end = null;
      
      setLocalSelectionStart(dateString);
      setLocalSelectionEnd(null);
      setError('');
    }
  };

  const isDateInRange = (dateString) => {
    const ref = selectionRef.current;
    
    if (!ref.start || !ref.end) {
      // If only start date is selected, highlight just that day
      if (ref.start && dateString === ref.start) {
        return true;
      }
      return false;
    }
    
    const date = dayjs(dateString);
    const start = dayjs(ref.start);
    const end = dayjs(ref.end);
    
    // Include the start and end dates themselves
    return (date.isAfter(start.subtract(1, 'day')) || date.isSame(start, 'day')) && 
           (date.isBefore(end.add(1, 'day')) || date.isSame(end, 'day'));
  };

  // Search function using ref for stable state
  const handleSearch = (stopoverInfo) => {
    const ref = selectionRef.current;
    
    if (!ref.start || !ref.end) {
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
    } : null;
    
    console.log('Search with date range:', {
      start: ref.start,
      end: ref.end,
      stopover: stopoverInfoObj
    });
    
    // Pass the selected date range to the parent component
    if (onDateRangeSelect) {
      onDateRangeSelect([ref.start, ref.end]);
    }
    
    // Call the search function with stopover info
    if (onSearch) {
      onSearch(stopoverInfoObj, true, true);
    }
  };

  // Calendar segments rendering logic
  const sortSegments = (segments) => {
    const validSegments = segments
      .map(segment => ({
        ...segment,
        ...isValidSegment(segment)
      }))
      .filter(segment => segment.isValid);

    return getRequiredSegments(validSegments);
  };
  
  const isValidSegment = (segment) => {
    const [from, to] = segment.route.split('-');
    
    for (let i = 0; i < currentRoute.length - 1; i++) {
      if (currentRoute[i] === from && currentRoute[i + 1] === to) {
        return { isValid: true, index: i };
      }
    }
    return { isValid: false, index: -1 };
  };
  
  const getRequiredSegments = (existingSegments) => {
    const segmentMap = new Map(
      existingSegments.map(segment => [segment.route, segment])
    );

    const allSegments = [];
    for (let i = 0; i < currentRoute.length - 1; i++) {
      const route = `${currentRoute[i]}-${currentRoute[i + 1]}`;
      const segment = segmentMap.get(route) || {
        route,
        classes: { Y: false, J: false, F: false },
        index: i
      };
      allSegments.push(segment);
    }

    return allSegments.sort((a, b) => a.index - b.index);
  };
  
  const hasAnyAvailability = (segments) => {
    return segments.some(segment => 
      segment.classes.Y || segment.classes.J || segment.classes.F
    );
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

  // Handle modal close
  const handleModalClose = () => {
    setIsModalOpen(false);
  };

  // Render availability badges
  const renderAvailabilityBadges = (route, classes) => {
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

  // Calendar constants
  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDayOfMonth = getFirstDayOfMonth(currentYear, currentMonth);
  const monthNames = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"];
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div>
      {/* Show Calendar button - always visible */}
      <div className="show-calendar-button" style={{ marginBottom: '10px' }}>
        <Button
          type="primary"
          onClick={() => {
            // Show calendar by modifying DOM directly
            const calendarContainer = document.querySelector(".calendar-container");
            
            if (calendarContainer) {
              calendarContainer.style.display = "block";
            }
            
            console.log("Calendar shown via DOM manipulation");
          }}
        >
          Show Calendar
        </Button>
      </div>
      
      {/* Calendar container with a class for DOM manipulation */}
      <div className="calendar-container" style={{ padding: '20px' }}>
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

            {/* Empty cells for days of week before the first day of month */}
            {Array.from({ length: firstDayOfMonth }).map((_, index) => (
              <div key={`empty-${index}`} style={{ 
                backgroundColor: 'white',
                minHeight: '120px',
                padding: '8px'
              }} />
            ))}

            {/* Calendar day cells */}
            {Array.from({ length: daysInMonth }).map((_, index) => {
              const day = index + 1;
              const dateString = formatDate(currentYear, currentMonth, day);
              const flights = flightData?.[dateString] || [];
              const validFlights = flights.length > 0 ? sortSegments(flights) : [];
              const showFlights = validFlights.length > 0 && hasAnyAvailability(validFlights);
              const isSelected = isDateInRange(dateString);
              const isStart = dateString === selectionRef.current.start;
              const isEnd = dateString === selectionRef.current.end;

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
                  onClick={(e) => {
                    // Prevent event bubbling
                    e.stopPropagation();
                    // Ensure click handler works properly
                    console.log(`Clicking on day ${day} (${dateString})`);
                    handleDateClick(dateString);
                  }}
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

          {/* Error message */}
          {error && (
            <div style={{ 
              color: '#ff4d4f', 
              marginTop: '16px',
              textAlign: 'center' 
            }}>
              {error}
            </div>
          )}

          {/* Controls */}
          <div style={{ 
            marginTop: '16px',
            display: 'flex',
            justifyContent: 'flex-start',
            alignItems: 'center',
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
                onClick={() => handleSearch(null)}
                disabled={!selectionStart || !selectionEnd || (selectedConnection && !stopoverDays)}
              >
                Search
              </Button>
              <Button
                onClick={() => {
                  // Hide calendar by adding CSS class directly to avoid state changes
                  const calendarContainer = document.querySelector(".calendar-container");
                  
                  if (calendarContainer) {
                    calendarContainer.style.display = "none";
                  }
                  
                  console.log("Calendar hidden via DOM manipulation");
                }}
              >
                Hide Calendar
              </Button>
            </div>
          </div>
        </div>

      <FlightDetailsModal
        isModalOpen={isModalOpen}
        onClose={handleModalClose}
        selectedFlights={selectedFlights}
        pricingData={pricingData}
        currentRoute={currentRoute}
      />
      
      <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '12px', color: '#888' }}>
        Route Builder © Ha Nguyen @ 2025
      </div>
    </div>
  );
};

export default FlightAvailabilityCalendar;