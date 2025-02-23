import React, { useState } from 'react';
import { Select, InputNumber, Button, Table, Card, Tag, Spin, Input } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { airports } from '../data/airports';
import airlines from '../data/airlines';

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
      width: 100,
    },
    {
      title: 'Destination',
      dataIndex: 'arrival',
      sorter: (a, b) => a.arrival.localeCompare(b.arrival),
      width: 100,
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
      width: 300,
    },
    {
      title: 'Stops',
      dataIndex: 'numConnections',
      sorter: (a, b) => a.numConnections - b.numConnections,
      render: (num) => {
        let color;
        switch (num) {
          case 0:
            color = 'green';
            break;
          case 1:
            color = 'blue';
            break;
          case 2:
            color = 'orange';
            break;
          case 3:
            color = 'gold';
            break;
          default:
            color = 'red';
        }
        return (
          <Tag color={color}>
            {num === 0 ? 'Direct' : `${num} Stop${num > 1 ? 's' : ''}`}
          </Tag>
        );
      },
      width: 100,
    },
    {
      title: 'Distance',
      dataIndex: 'totalDistance',
      sorter: (a, b) => a.totalDistance - b.totalDistance,
      render: (distance) => distance.toLocaleString(),
      width: 120,
      align: 'right',
    },
    {
      title: 'Economy',
      dataIndex: 'YPrice',
      sorter: (a, b) => a.YPrice - b.YPrice,
      render: (price) => price.toLocaleString(),
      width: 120,
      align: 'right',
    },
    {
      title: 'Business',
      dataIndex: 'JPrice',
      sorter: (a, b) => a.JPrice - b.JPrice,
      render: (price) => price.toLocaleString(),
      width: 120,
      align: 'right',
    },
    {
      title: 'First',
      dataIndex: 'FPrice',
      sorter: (a, b) => a.FPrice - b.FPrice,
      render: (price) => price.toLocaleString(),
      width: 120,
      align: 'right',
    },
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
    if (!searchResults || !tableSearchText) return searchResults?.routes;
    
    const searchTerms = tableSearchText.toLowerCase().split(/\s+/).filter(term => term);
    
    return searchResults.routes.filter(route => {
      const routeString = `${route.departure} ${route.arrival} ${route.connections.join(' ')}`.toLowerCase();
      
      // Check if all search terms are present in any order
      return searchTerms.every(term => routeString.includes(term));
    });
  };

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
            scroll={{ x: 1010 }}
          />
        </Card>
      )}

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