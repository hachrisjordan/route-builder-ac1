import React, { useState, useEffect, useRef } from 'react';
import { Button, Typography } from 'antd';
import dayjs from 'dayjs';

const { Title } = Typography;

const NormalFlightAvailabilityCalendar = ({ flightData, currentRoute, onDateRangeSelect, selectedRange }) => {
  // State initialization
  const [currentMonth, setCurrentMonth] = useState(dayjs().month());
  const [currentYear, setCurrentYear] = useState(dayjs().year());
  const [localSelectionStart, setLocalSelectionStart] = useState(null);
  const [localSelectionEnd, setLocalSelectionEnd] = useState(null);
  const [error, setError] = useState('');
  
  // Create derived values for selection that can be used in the component
  const selectionStart = localSelectionStart;
  const selectionEnd = localSelectionEnd;
  
  // Track selection changes with a ref to prevent race conditions
  const selectionRef = useRef({ start: null, end: null });

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
    if (!selectionRef.current.start) {
      selectionRef.current.start = dateString;
      selectionRef.current.end = null;
      
      setLocalSelectionStart(dateString);
      setLocalSelectionEnd(null);
      setError('');
    } else if (!selectionRef.current.end) {
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

      selectionRef.current.end = dateString;
      setLocalSelectionEnd(dateString);
      
      if (onDateRangeSelect) {
        onDateRangeSelect([start, end]);
      }
    } else {
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
      if (ref.start && dateString === ref.start) {
        return true;
      }
      return false;
    }
    
    const date = dayjs(dateString);
    const start = dayjs(ref.start);
    const end = dayjs(ref.end);
    
    return (date.isAfter(start.subtract(1, 'day')) || date.isSame(start, 'day')) && 
           (date.isBefore(end.add(1, 'day')) || date.isSame(end, 'day'));
  };

  // Render availability badges
  const renderAvailabilityBadges = (route, classes) => {
    const getBackgroundColor = (classCode, available) => {
      if (!available) return 'transparent';
      switch (classCode) {
        case 'Y': return '#E8E1F2';
        case 'W': return '#E8E1F2';
        case 'J': return '#F3CD87';
        case 'F': return '#D88A3F';
        default: return 'transparent';
      }
    };

    const classesToShow = ['Y', 'W', 'J', 'F'];

    return (
      <div style={{ display: 'flex', gap: '2px' }}>
        {classesToShow.map(classCode => (
          <div
            key={classCode}
            style={{
              backgroundColor: getBackgroundColor(classCode, classes[classCode]),
              color: classes[classCode] ? '#684634' : '#999',
              padding: '0px 4px',
              borderRadius: '4px',
              fontSize: '13px',
              fontFamily: 'Menlo',
              width: '20px',
              textAlign: 'center',
              position: 'relative'
            }}
          >
            {classes[classCode] ? classCode : '-'}
            {classes[classCode] && !classes[`${classCode}Direct`] && (
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: 'repeating-linear-gradient(45deg, transparent, transparent 3px, rgba(255,255,255,0.7) 3px, rgba(255,255,255,0.7) 6px)',
                  pointerEvents: 'none'
                }}
              />
            )}
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
      {/* Calendar container */}
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
            style={{ backgroundColor: '#000000' }}
          >
            &larr;
          </Button>
          <Title level={4} style={{ margin: 0 }}>{monthNames[currentMonth]} {currentYear}</Title>
          <Button 
            type="primary"
            onClick={goToNextMonth}
            style={{ backgroundColor: '#000000' }}
          >
            &rarr;
          </Button>
        </div>

        {/* Calendar grid */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(7, 180px)',
          border: '1px solid #f0f0f0',
          backgroundColor: '#f0f0f0',
          gap: '1px',
          fontFamily: 'Menlo, monospace',
          width: 'fit-content'
        }}>
          {/* Day headers */}
          {dayNames.map(day => (
            <div key={day} style={{ 
              backgroundColor: '#f5f5f5',
              padding: '8px',
              textAlign: 'center',
              fontWeight: '500',
              width: '180px'
            }}>
              {day}
            </div>
          ))}

          {/* Empty cells for days of week before the first day of month */}
          {Array.from({ length: firstDayOfMonth }).map((_, index) => (
            <div key={`empty-${index}`} style={{ 
              backgroundColor: 'white',
              minHeight: '120px',
              padding: '8px',
              width: '180px'
            }} />
          ))}

          {/* Calendar day cells */}
          {Array.from({ length: daysInMonth }).map((_, index) => {
            const day = index + 1;
            const dateString = formatDate(currentYear, currentMonth, day);
            const flights = flightData?.data?.[dateString] || {};
            
            // Sort routes based on the pattern: BOS-EWR/JFK/LGA first, then EWR/JFK/LGA-MIA
            const validFlights = Object.entries(flights)
              .map(([route, data]) => ({
                route,
                classes: {
                  Y: data.classes.Y.available,
                  W: data.classes.W.available,
                  J: data.classes.J.available,
                  F: data.classes.F.available,
                  YDirect: data.classes.Y.direct,
                  WDirect: data.classes.W.direct,
                  JDirect: data.classes.J.direct,
                  FDirect: data.classes.F.direct
                }
              }))
              .sort((a, b) => {
                const [aFrom] = a.route.split('-');
                const [bFrom] = b.route.split('-');
                
                // If one route starts with the first airport in currentRoute, it goes first
                if (aFrom === currentRoute[0] && bFrom !== currentRoute[0]) return -1;
                if (bFrom === currentRoute[0] && aFrom !== currentRoute[0]) return 1;
                
                // For routes starting with the same airport, sort alphabetically
                return a.route.localeCompare(b.route);
              });

            const showFlights = validFlights.length > 0;
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
                  border: isStart || isEnd ? '2px solid #000000' : 'none',
                  width: '180px'
                }}
                onClick={(e) => {
                  e.stopPropagation();
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
                          alignItems: 'center',
                          gap: '20px'
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
      </div>
    </div>
  );
};

export default NormalFlightAvailabilityCalendar; 