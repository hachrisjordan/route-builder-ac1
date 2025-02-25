import { Tag } from 'antd';
import { Button } from 'antd';
import { DownOutlined } from '@ant-design/icons';

export const getResultColumns = (onRouteSelect) => [
  {
    title: 'Origin',
    dataIndex: 'departure',
    sorter: (a, b) => a.departure.localeCompare(b.departure),
    width: 80,
  },
  {
    title: 'Connections',
    key: 'connections',
    render: (_, record) => (
      <span>
        {record.connections.length > 0 
          ? record.connections.join(' → ')
          : '-'}
      </span>
    ),
    width: 200,
    sorter: (a, b) => {
      if (a.connections.length !== b.connections.length) {
        return a.connections.length - b.connections.length;
      }
      return a.connections.join('').localeCompare(b.connections.join(''));
    },
    sortDirections: ['ascend', 'descend'],
  },
  {
    title: 'Destination',
    dataIndex: 'arrival',
    sorter: (a, b) => a.arrival.localeCompare(b.arrival),
    width: 80,
  },
  {
    title: 'Stops',
    dataIndex: 'numConnections',
    sorter: (a, b) => a.numConnections - b.numConnections,
    render: (num) => {
      let color;
      switch (num) {
        case 0: color = 'green'; break;
        case 1: color = 'blue'; break;
        case 2: color = 'orange'; break;
        case 3: color = 'gold'; break;
        default: color = 'red';
      }
      return (
        <Tag color={color}>
          {num === 0 ? 'Direct' : `${num} Stop${num > 1 ? 's' : ''}`}
        </Tag>
      );
    },
    width: 80,
  },
  {
    title: 'Distance',
    dataIndex: 'totalDistance',
    sorter: (a, b) => a.totalDistance - b.totalDistance,
    render: (distance) => distance.toLocaleString(),
    width: 60,
    align: 'right',
  },
  {
    title: 'Economy',
    dataIndex: 'YPrice',
    sorter: (a, b) => a.YPrice - b.YPrice,
    render: (price) => price.toLocaleString(),
    width: 80,
    align: 'right',
  },
  {
    title: 'Business',
    dataIndex: 'JPrice',
    sorter: (a, b) => a.JPrice - b.JPrice,
    render: (price) => price.toLocaleString(),
    width: 80,
    align: 'right',
  },
  {
    title: 'First',
    dataIndex: 'FPrice',
    sorter: (a, b) => a.FPrice - b.FPrice,
    render: (price) => price.toLocaleString(),
    width: 80,
    align: 'right',
  },
  {
    title: 'Y %',
    dataIndex: 'Ynet',
    width: 160,
    render: (text) => text || '-',
    sorter: (a, b) => {
      const getPercent = (str) => {
        if (!str) return 0;
        const match = str.match(/^(-?\d+)/);
        return match ? parseInt(match[0]) : 0;
      };
      return getPercent(a.Ynet) - getPercent(b.Ynet);
    },
  },
  {
    title: 'J %',
    dataIndex: 'Jnet',
    width: 160,
    render: (text) => text || '-',
    sorter: (a, b) => {
      const getPercent = (str) => {
        if (!str) return 0;
        const match = str.match(/^(-?\d+)/);
        return match ? parseInt(match[0]) : 0;
      };
      return getPercent(a.Jnet) - getPercent(b.Jnet);
    },
  },
  {
    title: 'F %',
    dataIndex: 'Fnet',
    width: 160,
    render: (text) => text || '-',
    sorter: (a, b) => {
      const getPercent = (str) => {
        if (!str) return 0;
        const match = str.match(/^(-?\d+)/);
        return match ? parseInt(match[0]) : 0;
      };
      return getPercent(a.Fnet) - getPercent(b.Fnet);
    },
  },
  {
    title: '',
    key: 'actions',
    width: 20,
    render: (_, record) => (
      <Button 
        type="link" 
        icon={<DownOutlined />}
        onClick={() => {
          const fullRoute = [record.departure, ...record.connections, record.arrival];
          onRouteSelect(fullRoute);
        }}
      />
    ),
  }
];

export const getSegmentColumns = () => [
  { 
    title: 'From', 
    dataIndex: 'from', 
    width: 80,
    sorter: (a, b) => a.from.localeCompare(b.from)
  },
  { 
    title: 'To', 
    dataIndex: 'to', 
    width: 80,
    sorter: (a, b) => a.to.localeCompare(b.to)
  },
  // ... other segment columns remain the same as in the original file
]; 