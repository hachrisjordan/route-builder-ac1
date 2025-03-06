import React, { useState } from 'react';
import { Select, InputNumber, Button, Card } from 'antd';
import { SearchOutlined, SwapOutlined } from '@ant-design/icons';
import { airports } from '../../data/airports';
import airlines from '../../data/airlines';

// Helper function to parse search input
const parseSearchInput = (inputValue) => {
  if (!inputValue) return '';
  
  try {
    if (typeof inputValue === 'object' && inputValue !== null) {
      if (inputValue._searchText) {
        return String(inputValue._searchText).toLowerCase();
      } else if (inputValue.input) {
        return String(inputValue.input).toLowerCase();
      } else if (inputValue.searchText) {
        return String(inputValue.searchText).toLowerCase();
      } else if (inputValue.value) {
        return String(inputValue.value).toLowerCase();
      } else if (inputValue.searchValue) {
        return String(inputValue.searchValue).toLowerCase();
      } else {
        // Try to extract searchValue from JSON string
        const str = String(inputValue);
        if (str.startsWith('{') && str.includes('searchValue')) {
          try {
            const parsed = JSON.parse(str);
            if (parsed.searchValue) {
              return String(parsed.searchValue).toLowerCase();
            }
          } catch (e) {
            // Parsing error, continue to fallback
          }
        }
        // If we get here, we couldn't extract a searchValue
        return '';
      }
    } else {
      return String(inputValue || '').toLowerCase();
    }
  } catch (error) {
    console.error('Error parsing input value:', error);
    return '';
  }
};

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

  // Initialization without debug logging
  
  const airportSelectProps = {
    showSearch: true,
    allowClear: true,
    suffixIcon: null,
    options: airports.map(airport => ({
      value: airport.IATA,
      label: `${airport.IATA} - ${airport.Name} (${airport.Country})`,
      iata: airport.IATA,
      name: airport.Name
    })),
    optionRender: (option) => {
      // Extract the parts of the label
      const iataCode = option.value;
      const label = option.label;
      const restOfLabel = label.substring(iataCode.length);
      
      return (
        <span>
          <span style={{ fontWeight: 'bold' }}>{iataCode}</span>
          {restOfLabel}
        </span>
      );
    },
    filterOption: (input, option) => {
      if (!input) return true;
      
      // Use the helper function to extract search text
      const searchText = parseSearchInput(input);
      
      const iata = String(option.value || '').toLowerCase();
      const label = String(option.label || '').toLowerCase();
      
      // Always include options where IATA matches, then name matches
      return iata.includes(searchText) || label.includes(searchText);
    },
    filterSort: (optionA, optionB, inputValue) => {
      // Handle case when inputValue is undefined or null
      if (!inputValue) return String(optionA.value || '').localeCompare(String(optionB.value || ''));
      
      // Use the helper function to extract input
      const input = parseSearchInput(inputValue);
      
      // No logging for airport searches
      
      // Get IATA codes
      const iataA = String(optionA.value || '').toLowerCase();
      const iataB = String(optionB.value || '').toLowerCase();
      
      // SCORING SYSTEM - higher scores come first
      let scoreA = 0;
      let scoreB = 0;
      
      // Priority 1 (Highest): IATA code exactly matches input
      if (iataA === input) scoreA = 1000;
      if (iataB === input) scoreB = 1000;
      
      // Priority 2: IATA code starts with input
      if (iataA.startsWith(input) && iataA !== input) scoreA = 500;
      if (iataB.startsWith(input) && iataB !== input) scoreB = 500;
      
      // Priority 3: IATA code contains input
      if (iataA.includes(input) && !iataA.startsWith(input)) scoreA = 200;
      if (iataB.includes(input) && !iataB.startsWith(input)) scoreB = 200;
      
      // Priority 4: Label contains input - separated by giving a special score
      // Now check if the labels contain the input
      const labelA = String(optionA.label || '').toLowerCase();
      const labelB = String(optionB.label || '').toLowerCase();
      
      if (scoreA === 0 && labelA.includes(input)) scoreA = 10;
      if (scoreB === 0 && labelB.includes(input)) scoreB = 10;
      
      // No logging for airport comparison
      
      // Compare scores (higher score first)
      if (scoreA !== scoreB) {
        return scoreB - scoreA;
      }
      
      // If tied on score, sort alphabetically by IATA code
      return String(iataA).localeCompare(String(iataB));
    },
    listHeight: 256,
    virtual: true,
    dropdownStyle: { maxHeight: 400 }
  };

  const airlineSelectProps = {
    showSearch: true,
    allowClear: true,
    optionRender: (option) => {
      // Bold the airline code part
      const airlineCode = option.value;
      return (
        <span>
          <span style={{ fontWeight: 'bold' }}>{airlineCode}</span> - {option.label}
        </span>
      );
    },
    filterOption: (input, option) => {
      if (!input) return true;
      
      // Use the helper function to extract search text
      const searchText = parseSearchInput(input);
      
      const code = String(option.value || '').toLowerCase();
      const label = String(option.label || '').toLowerCase();
      
      return code.includes(searchText) || label.includes(searchText);
    },
    filterSort: (optionA, optionB, inputValue) => {
      // Handle case when inputValue is undefined or null
      if (!inputValue) return String(optionA.value || '').localeCompare(String(optionB.value || ''));
      
      // Use the helper function to extract input
      const input = parseSearchInput(inputValue);
      
      // No logging for airline searches
      
      // Get airline codes
      const codeA = String(optionA.value || '').toLowerCase();
      const codeB = String(optionB.value || '').toLowerCase();
      
      // SCORING SYSTEM - higher scores come first
      let scoreA = 0;
      let scoreB = 0;
      
      // Priority 1 (Highest): Airline code exactly matches input
      if (codeA === input) scoreA = 1000;
      if (codeB === input) scoreB = 1000;
      
      // Priority 2: Airline code starts with input
      if (codeA.startsWith(input) && codeA !== input) scoreA = 500;
      if (codeB.startsWith(input) && codeB !== input) scoreB = 500;
      
      // Priority 3: Airline code contains input
      if (codeA.includes(input) && !codeA.startsWith(input)) scoreA = 200;
      if (codeB.includes(input) && !codeB.startsWith(input)) scoreB = 200;
      
      // Priority 4: Label contains input - separated by giving a special score
      // Now check if the labels contain the input
      const labelA = String(optionA.label || '').toLowerCase();
      const labelB = String(optionB.label || '').toLowerCase();
      
      if (scoreA === 0 && labelA.includes(input)) scoreA = 10;
      if (scoreB === 0 && labelB.includes(input)) scoreB = 10;
      
      // No logging for airline comparison
      
      // Compare scores (higher score first)
      if (scoreA !== scoreB) {
        return scoreB - scoreA;
      }
      
      // If tied on score, sort alphabetically by airline code
      return String(codeA).localeCompare(String(codeB));
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
          onChange={(value) => {
            setDeparture(value);
          }}
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
          onChange={(value) => {
            setArrival(value);
          }}
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

      {/* Search form styles moved to global CSS */}
    </Card>
  );
};

export default SearchForm; 