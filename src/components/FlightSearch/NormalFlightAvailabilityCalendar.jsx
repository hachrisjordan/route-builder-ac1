import React, { useState, useEffect, useRef } from 'react';
import { Button, Typography } from 'antd';
import dayjs from 'dayjs';
import { sources, getSourceByCodename } from './data/sources';

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
  const renderAvailabilityBadges = (route, classes, date) => {
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

    // Get the sources data for a specific class
    const getSourcesForClass = (classCode) => {
      const sourcesString = classes[`${classCode}Sources`];
      return sourcesString ? sourcesString.split(',') : [];
    };

    // Get the flight data for a specific class
    const getFlightsForClass = (classCode) => {
      return classes[`${classCode}Flights`] || [];
    };

    // Get the full airline name from source codename
    const getAirlineName = (codename) => {
      const source = getSourceByCodename(codename);
      return source ? `${source.airline} ${source.ffname}` : codename;
    };

    // Create enhanced tooltip content with better styling and airline logos
    const createEnhancedTooltip = (classCode, flights) => {
      // Create a div element for the tooltip content
      const tooltipDiv = document.createElement('div');
      tooltipDiv.style.width = '420px'; // Increased width more to avoid wrapping
      tooltipDiv.style.padding = '12px';
      tooltipDiv.style.backgroundColor = 'white';
      tooltipDiv.style.borderRadius = '8px';
      tooltipDiv.style.boxShadow = '0 3px 6px -4px rgba(0,0,0,.12), 0 6px 16px 0 rgba(0,0,0,.08), 0 9px 28px 8px rgba(0,0,0,.05)';
      tooltipDiv.style.fontFamily = 'Menlo, monospace';
      tooltipDiv.style.fontSize = '12px';
      
      // Add title
      const titleDiv = document.createElement('div');
      titleDiv.style.fontWeight = 'bold';
      titleDiv.style.fontSize = '14px';
      titleDiv.style.marginBottom = '12px';
      titleDiv.style.borderBottom = '1px solid #f0f0f0';
      titleDiv.style.paddingBottom = '8px';
      titleDiv.textContent = `${route} - ${classCode} Class`;
      tooltipDiv.appendChild(titleDiv);
      
      // Create table header
      const headerRow = document.createElement('div');
      headerRow.style.display = 'flex';
      headerRow.style.backgroundColor = '#fafafa';
      headerRow.style.padding = '8px 4px';
      headerRow.style.fontWeight = '500';
      headerRow.style.borderBottom = '1px solid #f0f0f0';
      
      const sourceHeader = document.createElement('div');
      sourceHeader.style.flex = '6'; // Increased from 5 to 6 for even more space
      sourceHeader.textContent = 'Program';
      
      const typeHeader = document.createElement('div');
      typeHeader.style.flex = '2';
      typeHeader.style.textAlign = 'center';
      typeHeader.textContent = 'Type';
      
      headerRow.appendChild(sourceHeader);
      headerRow.appendChild(typeHeader);
      tooltipDiv.appendChild(headerRow);
      
      // Create rows for each flight, sorted by airline name
      const rowsContainer = document.createElement('div');
      // No max height or scrolling
      
      // Sort flights by airline name instead of source codename
      const sortedFlights = [...flights].sort((a, b) => {
        const sourceA = getSourceByCodename(a.source || '');
        const sourceB = getSourceByCodename(b.source || '');
        
        // If both sources are found, compare by airline name
        if (sourceA && sourceB) {
          // Primary sort by airline name
          const airlineCompare = sourceA.airline.localeCompare(sourceB.airline);
          if (airlineCompare !== 0) return airlineCompare;
          
          // Secondary sort by FF program name if airlines are the same
          return sourceA.ffname.localeCompare(sourceB.ffname);
        }
        
        // If one source is not found, put it at the end
        if (!sourceA) return 1;
        if (!sourceB) return -1;
        
        // Fallback to source codename
        return (a.source || '').localeCompare(b.source || '');
      });
      
      sortedFlights.forEach((flight, index) => {
        const row = document.createElement('div');
        row.style.display = 'flex';
        row.style.padding = '8px 4px';
        row.style.borderBottom = index < sortedFlights.length - 1 ? '1px solid #f0f0f0' : 'none';
        row.style.alignItems = 'center';
        
        const sourceCell = document.createElement('div');
        sourceCell.style.flex = '6'; // Increased from 5 to 6 for even more space
        sourceCell.style.display = 'flex';
        sourceCell.style.alignItems = 'center';
        sourceCell.style.gap = '8px';
        
        // Add airline logo if available
        if (flight.source) {
          const source = getSourceByCodename(flight.source);
          if (source && source.iata) {
            const logo = document.createElement('img');
            logo.src = `/${source.iata}.png`; // Fixed the path to airline logos
            logo.alt = source.airline;
            logo.style.width = '24px';
            logo.style.height = '24px';
            logo.style.objectFit = 'contain';
            logo.onerror = function() {
              this.style.display = 'none';
            };
            sourceCell.appendChild(logo);
          }
        }
        
        // Add airline name
        const nameSpan = document.createElement('span');
        nameSpan.textContent = getAirlineName(flight.source || 'Unknown');
        sourceCell.appendChild(nameSpan);
        
        const typeCell = document.createElement('div');
        typeCell.style.flex = '2';
        typeCell.style.textAlign = 'center';
        typeCell.style.fontWeight = '500';
        typeCell.style.color = flight.direct ? '#52c41a' : '#f5222d';
        typeCell.textContent = flight.direct ? 'Direct' : 'Indirect';
        
        row.appendChild(sourceCell);
        row.appendChild(typeCell);
        rowsContainer.appendChild(row);
      });
      
      tooltipDiv.appendChild(rowsContainer);
      
      return tooltipDiv;
    };

    return (
      <div style={{ display: 'flex', gap: '2px' }}>
        {classesToShow.map(classCode => {
          const isAvailable = classes[classCode];
          const isDirect = classes[`${classCode}Direct`];
          const sources = getSourcesForClass(classCode);
          const flights = getFlightsForClass(classCode);
          
          return (
            <div
              key={classCode}
              title={!isAvailable ? "Not Available" : undefined}
              style={{
                backgroundColor: getBackgroundColor(classCode, isAvailable),
                color: isAvailable ? '#684634' : '#999',
                padding: '0px 4px',
                borderRadius: '4px',
                fontSize: '13px',
                fontFamily: 'Menlo',
                width: '20px',
                textAlign: 'center',
                position: 'relative',
                cursor: isAvailable ? 'pointer' : 'default'
              }}
              onMouseEnter={(e) => {
                if (isAvailable && flights.length > 0) {
                  const tooltipId = `tooltip-${route}-${classCode}-${date}`;
                  
                  // Remove any existing tooltip with the same ID
                  const existingTooltip = document.getElementById(tooltipId);
                  if (existingTooltip) {
                    document.body.removeChild(existingTooltip);
                  }
                  
                  // Create and populate the tooltip element
                  const tooltip = createEnhancedTooltip(classCode, flights);
                  tooltip.id = tooltipId;
                  tooltip.style.position = 'absolute';
                  tooltip.style.zIndex = '1000';
                  tooltip.style.left = `${e.clientX + 10}px`;
                  tooltip.style.top = `${e.clientY + 10}px`;
                  
                  // Add tooltip to the document body
                  document.body.appendChild(tooltip);
                }
              }}
              onMouseLeave={() => {
                const tooltip = document.getElementById(`tooltip-${route}-${classCode}-${date}`);
                if (tooltip) {
                  document.body.removeChild(tooltip);
                }
              }}
            >
              {isAvailable ? classCode : '-'}
              {isAvailable && !isDirect && (
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
          );
        })}
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
          gridTemplateColumns: 'repeat(7, 200px)',
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
              width: '200px'
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
              width: '200px'
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
                  FDirect: data.classes.F.direct,
                  YSources: data.classes.Y.sources,
                  WSources: data.classes.W.sources,
                  JSources: data.classes.J.sources,
                  FSources: data.classes.F.sources,
                  YFlights: data.classes.Y.flights,
                  WFlights: data.classes.W.flights,
                  JFlights: data.classes.J.flights,
                  FFlights: data.classes.F.flights
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
                  width: '200px'
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
                        {renderAvailabilityBadges(segment.route, segment.classes, dateString)}
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