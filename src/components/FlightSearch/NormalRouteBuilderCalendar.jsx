  <div style={{
    display: 'grid',
    gridTemplateColumns: 'repeat(7, 190px)',
    gap: '1px',
    backgroundColor: '#e5e7eb',
    width: 'fit-content'
  }}>
    {/* Day headers */}
    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
      <div key={day} style={{
        backgroundColor: '#f3f4f6',
        padding: '8px',
        textAlign: 'center',
        fontWeight: 'bold',
        width: '190px'
      }}>
        {day}
      </div>
    ))}
    
    {/* Empty cells for days before the first of the month */}
    {Array.from({ length: firstDayOfMonth }, (_, i) => (
      <div key={`empty-${i}`} style={{
        backgroundColor: '#f3f4f6',
        padding: '8px',
        width: '190px'
      }} />
    ))}
    
    {/* Days of the month */}
    {Array.from({ length: daysInMonth }, (_, i) => {
      const date = new Date(year, month, i + 1);
      const dateStr = date.toISOString().split('T')[0];
      const dayFlights = flightData[dateStr] || {};
      
      return (
        <div key={i} style={{
          backgroundColor: '#f3f4f6',
          padding: '8px',
          minHeight: '120px',
          width: '190px'
        }}>
          <div style={{ marginBottom: '4px', fontWeight: 'bold' }}>
            {i + 1}
          </div>
          {renderDayContent(dateStr, dayFlights)}
        </div>
      );
    })}
  </div> 