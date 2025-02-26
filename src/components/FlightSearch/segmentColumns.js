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
    console.error('Missing required parameters:', { time: cleanTime, baseDate });
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
  // If no startDay provided, log error but continue with current date
  if (!startDay) {
    console.error('No startDay provided to getSegmentColumns');
    startDay = dayjs().startOf('day');
  }

  const baseDayjs = dayjs(startDay).startOf('day');
  
  console.log('\ngetSegmentColumns using startDay:', {
    startDay: baseDayjs.format('YYYY-MM-DD'),
    isValid: baseDayjs.isValid()
  });

  return [
    {
      title: '',
      dataIndex: 'select',
      width: 30,
      render: (_, record) => (
        <input 
          type="checkbox" 
          checked={!!record.isSelected}
          onChange={() => {
            onFlightSelect(record, record.segmentIndex);
          }}
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
                objectFit: 'contain'
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
      title: 'Duration',
      dataIndex: 'duration',
      width: 20,
      sorter: (a, b) => a.duration - b.duration,
      render: (duration) => formatDuration(duration)
    },
    { 
      title: 'Aircraft', 
      dataIndex: 'aircraft', 
      width: 240,
      sorter: (a, b) => a.aircraft.localeCompare(b.aircraft)
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
      width: 40,
      align: 'center',
      sorter: (a, b) => (a.economy === b.economy ? 0 : a.economy ? -1 : 1),
      render: hasClass => hasClass ? <CheckOutlined style={{ color: '#52c41a' }} /> : null
    },
    { 
      title: 'Business', 
      dataIndex: 'business', 
      width: 40,
      align: 'center',
      sorter: (a, b) => (a.business === b.business ? 0 : a.business ? -1 : 1),
      render: hasClass => hasClass ? <CheckOutlined style={{ color: '#52c41a' }} /> : null
    },
    { 
      title: 'First', 
      dataIndex: 'first', 
      width: 40,
      align: 'center',
      sorter: (a, b) => (a.first === b.first ? 0 : a.first ? -1 : 1),
      render: hasClass => hasClass ? <CheckOutlined style={{ color: '#52c41a' }} /> : null
    }
  ];
}; 