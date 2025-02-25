import { CheckOutlined } from '@ant-design/icons';

const formatDuration = (minutes) => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}:${mins.toString().padStart(2, '0')}`;
};

export const getSegmentColumns = (onFlightSelect) => [
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
    width: 60,
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
    width: 40,
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
    dataIndex: 'departs', 
    width: 40,
    defaultSortOrder: 'ascend',
    sorter: (a, b) => {
      const aDayDiff = a.departs.includes('+') ? 
        parseInt(a.departs.match(/\+(\d+)/)[1]) : 0;
      const bDayDiff = b.departs.includes('+') ? 
        parseInt(b.departs.match(/\+(\d+)/)[1]) : 0;
      
      const aTime = a.departs.split(' ')[0];
      const bTime = b.departs.split(' ')[0];
      
      if (aDayDiff !== bDayDiff) {
        return aDayDiff - bDayDiff;
      }
      return aTime.localeCompare(bTime);
    }
  },
  { 
    title: 'Arrives', 
    dataIndex: 'arrives', 
    width: 40,
    sorter: (a, b) => {
      const aDayDiff = a.arrives.includes('+') ? 
        parseInt(a.arrives.match(/\+(\d+)/)[1]) : 0;
      const bDayDiff = b.arrives.includes('+') ? 
        parseInt(b.arrives.match(/\+(\d+)/)[1]) : 0;
      
      const aTime = a.arrives.split(' ')[0];
      const bTime = b.arrives.split(' ')[0];
      
      if (aDayDiff !== bDayDiff) {
        return aDayDiff - bDayDiff;
      }
      return aTime.localeCompare(bTime);
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