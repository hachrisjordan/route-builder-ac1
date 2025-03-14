import { CheckOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

const formatDuration = (minutes) => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}:${mins.toString().padStart(2, '0')}`;
};

const formatTimeWithDayDiff = (time, baseDate) => {
  // Remove any existing (+n) suffix from the time
  const cleanTime = time.replace(/\s*\(\+\d+\)$/, '');
  
  if (!cleanTime || !baseDate) {
    return '--:--';
  }

  // Parse the date from DepartsAt/ArrivesAt which should be in YYYY-MM-DD HH:mm:ss format
  const flightDate = dayjs(cleanTime);

  if (!flightDate.isValid()) {
    return cleanTime;
  }

  // Format as "HH:mm MM-DD"
  return flightDate.format('HH:mm MM-DD');
};

export const getSegmentColumns = (onFlightSelect, startDay) => {
  // If no startDay provided, use current date
  if (!startDay) {
    startDay = dayjs().startOf('day');
  }

  const baseDayjs = dayjs(startDay).startOf('day');
  
  // No logging startDay

  return [
    {
      title: '',
      dataIndex: 'select',
      width: 30,
      render: (_, record) => (
        <input 
          type="checkbox" 
          checked={record.isSelected}
          onChange={() => onFlightSelect(record, record.segmentIndex)}
          // Allow multiple selections
          style={{ cursor: 'pointer' }}
          // Remove any default behavior that might prevent multiple selections
          onClick={(e) => e.stopPropagation()}
        />
      )
    },
    { 
      title: 'From',
      dataIndex: 'from',
      width: 40,
      sorter: (a, b) => a.from.localeCompare(b.from)
    },
    { 
      title: 'To',
      dataIndex: 'to',
      width: 40,
      sorter: (a, b) => a.to.localeCompare(b.to)
    },
    { 
      title: 'Flight #', 
      dataIndex: 'flightNumber', 
      width: 100,
      sorter: (a, b) => a.flightNumber.localeCompare(b.flightNumber)
    },
    { 
      title: 'Airlines', 
      dataIndex: 'airlines', 
      width: 240,
      sorter: (a, b) => a.airlines.localeCompare(b.airlines),
      render: (text, record) => {
        const airlineCode = record.flightNumber.substring(0, 2);
        const imagePath = `${process.env.PUBLIC_URL}/${airlineCode}.png`;
        
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <img 
              src={imagePath}
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
            {text}
          </div>
        );
      }
    },
    { 
      title: 'Aircraft', 
      dataIndex: 'aircraft', 
      width: 240,
      sorter: (a, b) => a.aircraft.localeCompare(b.aircraft)
    },
    { 
      title: 'Duration',
      dataIndex: 'duration',
      width: 20,
      sorter: (a, b) => a.duration - b.duration,
      render: (duration) => formatDuration(duration)
    },
    { 
      title: 'Departs', 
      dataIndex: 'DepartsAt',
      width: 100,
      defaultSortOrder: 'ascend',
      render: (time) => formatTimeWithDayDiff(time, baseDayjs),
      sorter: (a, b) => {
        const aTime = dayjs(a.DepartsAt).valueOf();
        const bTime = dayjs(b.DepartsAt).valueOf();
        return aTime - bTime;
      }
    },
    { 
      title: 'Arrives', 
      dataIndex: 'ArrivesAt',
      width: 100,
      render: (time) => formatTimeWithDayDiff(time, baseDayjs),
      sorter: (a, b) => {
        const aTime = dayjs(a.ArrivesAt).valueOf();
        const bTime = dayjs(b.ArrivesAt).valueOf();
        return aTime - bTime;
      }
    },
    {
      title: 'Economy',
      dataIndex: 'economy',
      key: 'economy',
      width: 20,
      sorter: (a, b) => {
        // Sort by availability (true comes before false)
        return (a.economy === true ? 1 : 0) - (b.economy === true ? 1 : 0);
      },
      render: (economy) => economy ? 
        <span style={{ color: '#52c41a', fontSize: '16px' }}>●</span> : 
        <span style={{ color: '#d9d9d9' }}>-</span>
    },
    {
      title: 'Business',
      dataIndex: 'business',
      key: 'business',
      width: 20,
      sorter: (a, b) => {
        // Sort by availability (true comes before false)
        return (a.business === true ? 1 : 0) - (b.business === true ? 1 : 0);
      },
      render: (business) => business ? 
        <span style={{ color: '#52c41a', fontSize: '16px' }}>●</span> : 
        <span style={{ color: '#d9d9d9' }}>-</span>
    },
    {
      title: 'First',
      dataIndex: 'first',
      key: 'first',
      width: 20,
      sorter: (a, b) => {
        // Sort by availability (true comes before false)
        return (a.first === true ? 1 : 0) - (b.first === true ? 1 : 0);
      },
      render: (first) => first ? 
        <span style={{ color: '#52c41a', fontSize: '16px' }}>●</span> : 
        <span style={{ color: '#d9d9d9' }}>-</span>
    }
  ];
}; 