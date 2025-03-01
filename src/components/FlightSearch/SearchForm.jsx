import React, { useState } from 'react';
import { Select, InputNumber, Button, Card } from 'antd';
import { SearchOutlined, SwapOutlined } from '@ant-design/icons';
import { airports } from '../../data/airports';
import airlines from '../../data/airlines';

const SearchForm = ({ onSearch, isLoading, errors }) => {
  const [departure, setDeparture] = useState(null);
  const [arrival, setArrival] = useState(null);
  const [selectedAirlines, setSelectedAirlines] = useState([]);
  const [maxSegments, setMaxSegments] = useState(4);

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
      
      if (option.value.toLowerCase().includes(input)) {
        option.priority = 2;
        return true;
      }
      
      if (option.label.toLowerCase().includes(input)) {
        option.priority = 1;
        return true;
      }
      
      return false;
    },
    filterSort: (optionA, optionB) => {
      if (optionA.priority !== optionB.priority) {
        return optionB.priority - optionA.priority;
      }
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

  const handleSubmit = () => {
    onSearch({
      departure,
      arrival,
      selectedAirlines,
      maxSegments
    });
  };

  // Function to swap departure and arrival airports
  const swapAirports = () => {
    const temp = departure;
    setDeparture(arrival);
    setArrival(temp);
  };

  return (
    <Card className="search-form">
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

      <div className="swap-button-container">
        <Button 
          icon={<SwapOutlined />} 
          onClick={swapAirports}
          type="text"
          className="swap-button"
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
        onClick={handleSubmit}
        loading={isLoading}
        className="search-button"
      >
        Search
      </Button>

      <style jsx>{`
        .search-form {
          margin-bottom: 20px;
          box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.03), 
                      0 1px 6px -1px rgba(0, 0, 0, 0.02), 
                      0 2px 4px 0 rgba(0, 0, 0, 0.02);
        }
        .flight-search-element {
          margin-bottom: 16px;
        }
        .element-label {
          margin-bottom: 8px;
          font-weight: 500;
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
        .swap-button-container {
          display: flex;
          justify-content: center;
          margin-bottom: 0;
        }
        .swap-button {
          padding: 0 8px;
        }
      `}</style>
    </Card>
  );
};

export default SearchForm; 