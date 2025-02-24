import React, { useState, useEffect } from 'react';
import { Select, InputNumber, Button, Table, Card, Tag, Spin, Input, Modal, DatePicker } from 'antd';
import { SearchOutlined, DownOutlined } from '@ant-design/icons';
import { airports } from '../data/airports';
import airlines from '../data/airlines';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import routeDetails from '../data/route_details.json';
dayjs.extend(utc);

const FlightSearch = () => {
  const [departure, setDeparture] = useState(null);
  const [arrival, setArrival] = useState(null);
  const [selectedAirlines, setSelectedAirlines] = useState([]);
  const [maxSegments, setMaxSegments] = useState(4);
  const [searchResults, setSearchResults] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 25,
    total: 0,
  });
  const [errors, setErrors] = useState({
    departure: false,
    arrival: false,
    maxSegments: false
  });
  const [tableSearchText, setTableSearchText] = useState('');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedDates, setSelectedDates] = useState(null);
  const [currentRoute, setCurrentRoute] = useState(null);
  const [apiKey, setApiKey] = useState('');
  const [segmentDetails, setSegmentDetails] = useState([]);
  const [isLoadingSegments, setIsLoadingSegments] = useState(false);

  // Sort airlines alphabetically
  const sortedAirlines = [...airlines]
    .map(airline => ({
      ...airline,
      searchStr: `${airline.value} ${airline.label}`.toLowerCase()
    }))
    .sort((a, b) => a.label.localeCompare(b.label));

  const airportSelectProps = {
    showSearch: true,
    allowClear: true,
    suffixIcon: null,
    options: airports.map(airport => ({
      value: airport.IATA,
      label: `${airport.IATA} - ${airport.Name} (${airport.Country})`,
      searchStr: `${airport.IATA} ${airport.Name}`.toLowerCase()
    })),
    filterOption: (input, option) => {
      if (!input) return true;
      input = input.toString().toLowerCase();
      
      // IATA match
      if (option.value.toLowerCase().includes(input)) {
        option.priority = 2;
        return true;
      }
      
      // Name/label match
      if (option.label.toLowerCase().includes(input)) {
        option.priority = 1;
        return true;
      }
      
      return false;
    },
    filterSort: (optionA, optionB) => {
      // Sort by priority (IATA matches first)
      if (optionA.priority !== optionB.priority) {
        return optionB.priority - optionA.priority;
      }
      // Then alphabetically
      return optionA.label.localeCompare(optionB.label);
    },
    listHeight: 256,
    virtual: true,
    dropdownStyle: { maxHeight: 400 }
  };

  const airlineSelectProps = {
    showSearch: true,
    allowClear: true,
    filterSort: (optionA, optionB, input) => {
      if (!input) return optionA.label.localeCompare(optionB.label);
      
      const searchInput = input.toString().toLowerCase();
      const aMatch = optionA.searchStr.includes(searchInput);
      const bMatch = optionB.searchStr.includes(searchInput);
      
      if (aMatch && !bMatch) return -1;
      if (!aMatch && bMatch) return 1;

      return optionA.label.localeCompare(optionB.label);
    },
    filterOption: (input, option) => {
      if (!input) return true;
      const searchInput = input.toString().toLowerCase();
      return option.searchStr.includes(searchInput);
    },
    listHeight: 400,
    virtual: false,
    menuItemSelectedIcon: null,
    dropdownStyle: { maxHeight: 400 }
  };

  const columns = [
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
            setCurrentRoute(fullRoute);
            setIsModalVisible(true);
          }}
        />
      ),
    }
  ];

  const handleSearch = async () => {
    // Reset errors
    setErrors({
      departure: !departure,
      arrival: !arrival,
      maxSegments: !maxSegments
    });

    // Validate mandatory fields
    if (!departure || !arrival || !maxSegments) {
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('https://backend-284998006367.us-central1.run.app/api/find-routes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          departureAirport: departure,
          arrivalAirport: arrival,
          excludedAirline: selectedAirlines.length ? selectedAirlines[0] : "null",
          maxSegments: maxSegments
        })
      });

      if (!response.ok) {
        throw new Error('Search failed');
      }

      const data = await response.json();
      setSearchResults(data);
      setPagination(prev => ({
        ...prev,
        total: data.routes.length
      }));
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTableChange = (newPagination, filters, sorter) => {
    setPagination(newPagination);
  };

  // Filter function for the table data
  const getFilteredData = () => {
    if (!searchResults?.routes || !tableSearchText) {
      return searchResults?.routes || [];
    }

    const searchLower = tableSearchText.toLowerCase();
    return searchResults.routes.filter(route => {
      // Convert all relevant fields to strings and check if they include the search text
      return (
        route.departure.toLowerCase().includes(searchLower) ||
        route.arrival.toLowerCase().includes(searchLower) ||
        route.connections.join(' ').toLowerCase().includes(searchLower) ||
        route.YPrice.toString().includes(searchLower) ||
        route.JPrice.toString().includes(searchLower) ||
        route.FPrice.toString().includes(searchLower) ||
        (route.Ynet || '').toLowerCase().includes(searchLower) ||
        (route.Jnet || '').toLowerCase().includes(searchLower) ||
        (route.Fnet || '').toLowerCase().includes(searchLower)
      );
    });
  };

  const formatTime = (dateStr, baseDate) => {
    const date = dayjs(dateStr);
    const base = dayjs(baseDate);
    const dayDiff = date.diff(base, 'day');
    const timeStr = date.format('HH:mm');
    return dayDiff > 0 ? `${timeStr} (+${dayDiff})` : timeStr;
  };

  const getAirlineName = (code) => {
    const airline = airlines.find(a => a.value === code);
    return airline ? airline.label.replace(` (${code})`, '') : code;
  };

  const handleDateSearch = async () => {
    if (!selectedDates || !currentRoute || !apiKey) return;
    
    setIsLoadingSegments(true);
    const dateStr = selectedDates.format('YYYY-MM-DD');
    const segments = [];
    
    // Get segments from route_details.json
    for (let i = 0; i < currentRoute.length - 1; i++) {
      const origin = currentRoute[i];
      const destination = currentRoute[i + 1];
      
      const route = routeDetails.find(r => 
        r.origin === origin && 
        r.destination === destination && 
        r.date === dateStr
      );
      
      if (route) {
        segments.push(route.ID);
      }
    }

    try {
      const results = await Promise.all(
        segments.map(async (segmentId) => {
          const response = await fetch(`http://localhost:8080/api/seats/${segmentId}`, {
            method: 'GET',
            headers: {
              'accept': 'application/json',
              'Partner-Authorization': apiKey
            }
          });
          
          if (!response.ok) {
            throw new Error('Failed to fetch segment data');
          }
          
          return response.json();
        })
      );

      // Filter and process results
      const processedSegments = results.flatMap(result => 
        (result.data || [])
          .filter(trip => trip.Stops === 0)
          .map(trip => ({
            from: trip.OriginAirport,
            to: trip.DestinationAirport,
            flightNumber: trip.FlightNumbers,
            airlines: getAirlineName(trip.Carriers),
            aircraft: trip.Aircraft[0],
            departs: formatTime(trip.DepartsAt, dateStr),
            arrives: formatTime(trip.ArrivesAt, dateStr),
            cabin: trip.Cabin.charAt(0).toUpperCase() + trip.Cabin.slice(1)
          }))
      );

      setSegmentDetails(processedSegments);
    } catch (error) {
      console.error('Error fetching segment details:', error);
    } finally {
      setIsLoadingSegments(false);
    }
  };

  const segmentColumns = [
    { title: 'From', dataIndex: 'from', width: 80 },
    { title: 'To', dataIndex: 'to', width: 80 },
    { title: 'Flight', dataIndex: 'flightNumber', width: 100 },
    { title: 'Airlines', dataIndex: 'airlines', width: 150 },
    { title: 'Aircraft', dataIndex: 'aircraft', width: 150 },
    { title: 'Departs', dataIndex: 'departs', width: 100 },
    { title: 'Arrives', dataIndex: 'arrives', width: 100 },
    { title: 'Cabin', dataIndex: 'cabin', width: 100 },
  ];

  return (
    <div className="flight-search-container">
      <Card 
        className="search-form" 
        style={{ boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.03), 0 1px 6px -1px rgba(0, 0, 0, 0.02), 0 2px 4px 0 rgba(0, 0, 0, 0.02)' }}
      >
        <div className="flight-search-element">
          <div className="element-label">Departure Airport: *</div>
          <Select
            {...airportSelectProps}
            value={departure}
            onChange={setDeparture}
            placeholder="Select departure airport..."
            className="airport-select"
            status={errors.departure ? 'error' : ''}
          />
        </div>

        <div className="flight-search-element">
          <div className="element-label">Arrival Airport: *</div>
          <Select
            {...airportSelectProps}
            value={arrival}
            onChange={setArrival}
            placeholder="Select arrival airport..."
            className="airport-select"
            status={errors.arrival ? 'error' : ''}
          />
        </div>

        <div className="flight-search-element">
          <div className="element-label">Airlines Excluded:</div>
          <Select
            {...airlineSelectProps}
            mode="multiple"
            value={selectedAirlines}
            onChange={setSelectedAirlines}
            options={sortedAirlines}
            placeholder="Select airlines..."
            className="airline-select"
          />
        </div>

        <div className="segments-element">
          <div className="element-label">Maximum Segments *</div>
          <InputNumber
            min={1}
            max={5}
            value={maxSegments}
            onChange={setMaxSegments}
            status={errors.maxSegments ? 'error' : ''}
          />
        </div>

        <Button 
          type="primary"
          icon={<SearchOutlined />}
          onClick={handleSearch}
          loading={isLoading}
          className="search-button"
        >
          Search
        </Button>
      </Card>

      {searchResults && (
        <Card 
          className="results-card" 
          title={
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Search Results</span>
              <Input
                placeholder="Search routes..."
                value={tableSearchText}
                onChange={e => setTableSearchText(e.target.value)}
                style={{ width: 200 }}
                allowClear
              />
            </div>
          }
          style={{ boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.03), 0 1px 6px -1px rgba(0, 0, 0, 0.02), 0 2px 4px 0 rgba(0, 0, 0, 0.02)' }}
        >
          <Table
            dataSource={getFilteredData()}
            columns={columns}
            rowKey={(record, index) => index}
            pagination={{
              ...pagination,
              showSizeChanger: true,
              showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} routes`,
              pageSizeOptions: ['10', '25', '50', '100'],
              defaultPageSize: 25,
            }}
            loading={isLoading}
            onChange={handleTableChange}
            scroll={{ x: 1600 }}
            showSorterTooltip={true}
            sortDirections={['ascend', 'descend']}
          />
        </Card>
      )}

      <Modal
        title="Flight Details"
        open={isModalVisible}
        onOk={handleDateSearch}
        onCancel={() => {
          setIsModalVisible(false);
          setSelectedDates(null);
          setApiKey('');
          setSegmentDetails([]);
        }}
        okText="Search Flights"
        okButtonProps={{ 
          disabled: !selectedDates || !apiKey,
          loading: isLoadingSegments 
        }}
        width={900}
      >
        <div style={{ marginBottom: 16 }}>
          <div style={{ marginBottom: 8 }}>Select Travel Date:</div>
          <DatePicker
            style={{ width: '100%' }}
            onChange={(date) => setSelectedDates(date)}
            disabledDate={(current) => current && current < dayjs().startOf('day')}
          />
        </div>
        <div style={{ marginBottom: 16 }}>
          <div style={{ marginBottom: 8 }}>API Key:</div>
          <Input
            placeholder="Enter API key"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            style={{ width: '100%' }}
          />
        </div>
        {segmentDetails.length > 0 && (
          <Table
            dataSource={segmentDetails}
            columns={segmentColumns}
            pagination={false}
            size="small"
            rowKey={(record, index) => index}
          />
        )}
      </Modal>

      <style jsx>{`
        .flight-search-container {
          max-width: 1200px;
          margin: 20px auto;
          padding: 0 20px;
        }
        .search-form {
          margin-bottom: 20px;
        }
        .flight-search-element {
          margin-bottom: 16px;
        }
        .element-label {
          margin-bottom: 8px;
          font-weight: 500;
        }
        .element-label::after {
          content: " *";
          color: #ff4d4f;
          display: none;
        }
        .element-label:has(+ [data-required="true"])::after {
          display: inline;
        }
        .airport-select,
        .airline-select {
          width: 100%;
        }
        .segments-element {
          margin-bottom: 16px;
        }
        .search-button {
          margin-top: 24px;
          width: 100%;
        }
        .results-card {
          margin-top: 24px;
        }
        :global(.ant-table) {
          font-family: source-code-pro, Menlo, Monaco, Consolas, 'Courier New', monospace;
        }
      `}</style>
    </div>
  );
};

export default FlightSearch;