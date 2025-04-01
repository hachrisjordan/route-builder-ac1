import React from 'react';
import { Button } from 'antd';
import { LeftOutlined, RightOutlined, LoadingOutlined } from '@ant-design/icons';
import AvailabilityBadges, { hasAvailableBadges } from './AvailabilityBadges';

// Define date utilities directly in this file to avoid import issues
const monthNames = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const getDaysInMonth = (year, month) => {
  return new Date(year, month + 1, 0).getDate();
};

const getFirstDayOfMonth = (year, month) => {
  return new Date(year, month, 1).getDay();
};

const formatDate = (year, month, day) => {
  const paddedMonth = String(month + 1).padStart(2, '0');
  const paddedDay = String(day).padStart(2, '0');
  return `${year}-${paddedMonth}-${paddedDay}`;
};

const formatDateForDisplay = (dateString) => {
  if (!dateString) return '';
  
  const [year, month, day] = dateString.split('-');
  const date = new Date(year, parseInt(month, 10) - 1, day);
  
  return `${monthNames[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
};

// Utility function to check if a route has any available flights
const hasAvailableFlights = (route, dateString, flightData, directFilter, sourceFilter, airlinesFilter, pointsFilter, classFilter, groupFilters, segmentFilters) => {
  // Class to cabin code mapping
  const classToCabin = {
    'Economy': 'Y',
    'Premium Economy': 'W',
    'Business': 'J',
    'First': 'F'
  };
  
  // Get classes to check based on classFilter
  const classesToCheck = classFilter.length > 0 
    ? classFilter.map(cls => classToCabin[cls]).filter(Boolean)
    : Object.values(classToCabin);
  
  // If route or date data doesn't exist, return false
  if (!flightData || !flightData.data || !flightData.data[dateString] || !flightData.data[dateString][route]) {
    return false;
  }
  
  // Check if any class is available after filtering
  for (const classCode of classesToCheck) {
    const classData = flightData.data[dateString][route].classes[classCode];
    
    // Skip if class data doesn't exist or isn't available
    if (!classData || !classData.available) continue;
    
    // Skip if direct filter is on and this class doesn't have direct flights
    if (directFilter && !classData.direct) continue;
    
    // For advanced filtering logic, we would need to replicate the exact same logic
    // from AvailabilityBadges component's shouldShowAsAvailable method
    // For simplicity, we'll check if it's actually available after all filters
    const tempBadge = document.createElement('div');
    tempBadge.style.display = 'none';
    document.body.appendChild(tempBadge);
    
    // Render a temporary badge to check availability
    const ReactDOM = require('react-dom');
    ReactDOM.render(
      <AvailabilityBadges
        route={route}
        date={dateString}
        flightData={flightData}
        directFilter={directFilter}
        sourceFilter={sourceFilter}
        airlinesFilter={airlinesFilter}
        pointsFilter={pointsFilter}
        classes={classFilter.length > 0 ? classFilter : ['Economy', 'Premium Economy', 'Business', 'First']}
        groupFilters={groupFilters}
        segmentFilters={segmentFilters}
      />,
      tempBadge,
      () => {
        // Check if any badge is not a dash character (meaning it's available)
        const badgeTexts = Array.from(tempBadge.querySelectorAll('div[style*="text-align: center"]'))
          .map(badge => badge.textContent);
        
        const hasAvailable = badgeTexts.some(text => text !== '-');
        
        // Clean up
        ReactDOM.unmountComponentAtNode(tempBadge);
        document.body.removeChild(tempBadge);
      }
    );
    
    // If any class is available, return true
    return true;
  }
  
  // If no classes are available, return false
  return false;
};

const DateGrid = ({
  currentMonth,
  currentYear,
  flightData,
  cellPages,
  handlePageChange,
  handleDateClick,
  isDateInRange,
  error,
  filteredFlights,
  directFilter,
  sourceFilter,
  airlinesFilter,
  pointsFilter,
  classFilter,
  shouldRenderDate,
  goToPrevMonth,
  goToNextMonth,
  groupFilters,
  segmentFilters,
  currencyFilter
}) => {
  // Calendar calculations
  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth);
  
  // Maximum number of routes to display per page
  const MAX_ROUTES_PER_PAGE = 10;
  
  // Function to handle rendering the date cell content
  const renderDateCell = (day) => {
    const dateString = formatDate(currentYear, currentMonth, day);
    
    // Skip rendering if date doesn't pass the date filter
    if (!shouldRenderDate(dateString)) return null;
    
    // Check if we have availability data for this date
    const hasData = filteredFlights && filteredFlights[dateString];
    
    // Get current page for this cell
    const currentPage = cellPages[dateString] || 0;
    
    // Get routes for this date
    let routes = hasData ? Object.keys(filteredFlights[dateString]) : [];
    
    // For group and segment filters, filter out routes where all badges would be "-"
    if (hasData && 
        ((groupFilters && Object.keys(groupFilters).length > 0) || 
         (segmentFilters && Object.keys(segmentFilters).length > 0))) {
      
      console.log('[DEBUG] Filtering routes for date', dateString, 'with group/segment filters');
      
      routes = routes.filter(route => 
        hasAvailableBadges(
          route, 
          dateString, 
          flightData, 
          directFilter, 
          sourceFilter, 
          airlinesFilter, 
          pointsFilter, 
          classFilter.length > 0 ? classFilter : ['Economy', 'Premium Economy', 'Business', 'First'],
          groupFilters,
          segmentFilters
        )
      );
      
      console.log('[DEBUG] After filtering, routes remaining:', routes.length);
    }
    
    // Calculate pagination
    const totalPages = Math.ceil(routes.length / MAX_ROUTES_PER_PAGE);
    const startIndex = currentPage * MAX_ROUTES_PER_PAGE;
    const paginatedRoutes = routes.slice(startIndex, startIndex + MAX_ROUTES_PER_PAGE);
    
    // Whether we need pagination
    const needsPagination = routes.length > MAX_ROUTES_PER_PAGE;
    
    return (
      <div 
        key={day}
        style={{ 
          border: isDateInRange(dateString) ? '2px solid #000000' : 'none',
          padding: '8px',
          cursor: 'pointer',
          backgroundColor: isDateInRange(dateString) ? '#e6f4ff' : 'white',
          minHeight: '120px',
          width: '200px',
          fontFamily: 'Menlo, monospace',
          position: 'relative'
        }}
        onClick={() => handleDateClick(dateString)}
      >
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          marginBottom: '8px',
          alignItems: 'center'
        }}>
          <span style={{ 
            fontWeight: 'bold',
            fontSize: '13px'
          }}>
            {day}
          </span>
          
          {/* Show total routes count if we have data - moved to right side */}
          {hasData && routes.length > 0 && (
            <span style={{ 
              fontSize: '11px', 
              color: '#666',
              backgroundColor: '#f5f5f5',
              padding: '1px 5px',
              borderRadius: '4px'
            }}>
              {routes.length} routes
            </span>
          )}
        </div>
        
        {/* If we have data for this date, render it */}
        {hasData ? (
          <div style={{ minHeight: '80px' }}>
            {/* Show paginated availability badges for this date */}
            {paginatedRoutes.map(route => (
              <AvailabilityBadges
                key={route}
                route={route}
                date={dateString}
                flightData={flightData}
                directFilter={directFilter}
                sourceFilter={sourceFilter}
                airlinesFilter={airlinesFilter}
                pointsFilter={pointsFilter}
                classes={classFilter.length > 0 ? classFilter : ['Economy', 'Premium Economy', 'Business', 'First']}
                groupFilters={groupFilters}
                segmentFilters={segmentFilters}
                currencyFilter={currencyFilter}
              />
            ))}
          </div>
        ) : (
          <div style={{ 
            minHeight: '80px', 
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#999',
            fontSize: '12px',
            textAlign: 'center',
            marginTop: '20px'
          }}>
            No data
          </div>
        )}
        
        {/* Render pagination controls if we have multiple pages (now positioned at the bottom) */}
        {needsPagination && (
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center',
            marginTop: '8px',
            gap: '2px'
          }}>
            <button 
              onClick={(e) => {
                e.stopPropagation(); // Prevent click from propagating to date cell
                handlePageChange(dateString, 'prev', e);
              }}
              disabled={currentPage === 0}
              style={{ 
                border: 'none', 
                background: 'none',
                cursor: currentPage === 0 ? 'default' : 'pointer',
                color: currentPage === 0 ? '#ddd' : '#666',
                padding: '0 2px',
                display: 'flex',
                alignItems: 'center',
                fontSize: '10px'
              }}
            >
              <LeftOutlined />
            </button>
            <span style={{ 
              fontSize: '10px', 
              color: '#666', 
              display: 'flex', 
              alignItems: 'center' 
            }}>
              {currentPage + 1}/{totalPages}
            </span>
            <button 
              onClick={(e) => {
                e.stopPropagation(); // Prevent click from propagating to date cell
                handlePageChange(dateString, 'next', e);
              }}
              disabled={currentPage >= totalPages - 1}
              style={{ 
                border: 'none', 
                background: 'none',
                cursor: currentPage >= totalPages - 1 ? 'default' : 'pointer',
                color: currentPage >= totalPages - 1 ? '#ddd' : '#666',
                padding: '0 2px',
                display: 'flex',
                alignItems: 'center',
                fontSize: '10px'
              }}
            >
              <RightOutlined />
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div>
      {/* Show error message if there is one */}
      {error && (
        <div style={{ 
          color: '#ff4d4f', 
          marginBottom: '16px', 
          textAlign: 'center',
          padding: '8px',
          backgroundColor: '#fff2f0',
          border: '1px solid #ffccc7',
          borderRadius: '4px'
        }}>
          {error}
        </div>
      )}
      
      {/* Calendar header with month navigation */}
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
        <div style={{ fontWeight: 'bold', fontSize: '18px' }}>
          {monthNames[currentMonth]} {currentYear}
        </div>
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
        {Array.from({ length: firstDay }).map((_, index) => (
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
          return renderDateCell(day);
        })}
      </div>
    </div>
  );
};

export default DateGrid; 