import React, { useState } from 'react';
import { Button, Card, Typography, Badge } from 'antd';
import dayjs from 'dayjs';

const { Title } = Typography;

const FlightAvailabilityCalendar = ({ flightData, currentRoute, onDateRangeSelect, selectedRange, onSearch }) => {
  const [currentMonth, setCurrentMonth] = useState(dayjs().month());
  const [currentYear, setCurrentYear] = useState(dayjs().year());
  const [selectionStart, setSelectionStart] = useState(null);
  const [selectionEnd, setSelectionEnd] = useState(null);
  const [error, setError] = useState('');

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
    return (
      <div style={{ display: 'flex', gap: '2px' }}>
        {Object.entries(classes).map(([classCode, available]) => (
          <div
            key={classCode}
            style={{
              backgroundColor: available ? '#52c41a' : '#f5222d',
              color: 'white',
              padding: '0px 4px',
              borderRadius: '2px',
              fontSize: '13px',
              fontFamily: 'Menlo'
            }}
          >
            {classCode}
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
      setSelectionStart(dateString);
      setSelectionEnd(null);
      setError('');
    } else if (!selectionEnd) {
      const start = dayjs(selectionStart);
      const end = dayjs(dateString);
      
      if (end.isBefore(start)) {
        setError('End date cannot be before start date');
        return;
      }
      
      if (end.diff(start, 'days') > 7) {
        setError('Date range cannot exceed 7 days');
        return;
      }

      setSelectionEnd(dateString);
      onDateRangeSelect([start, end]);
    } else {
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

  return (
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
        justifyContent: 'center' 
      }}>
        <Button
          type="primary"
          onClick={onSearch}
          disabled={!selectionStart || !selectionEnd}
        >
          Search
        </Button>
      </div>
    </div>
  );
};

export default FlightAvailabilityCalendar; 