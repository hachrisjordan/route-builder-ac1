import React, { useState, useEffect } from 'react';
import { Card, Input, DatePicker, Button, Space, Row, Col } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import HybridPathInput from './HybridPathInput';
import SourcesExcludedInput from './SourcesExcludedInput';
import NormalFlightAvailabilityCalendar from './NormalFlightAvailabilityCalendar';
import './styles/NormalRouteBuilder.css';

const { RangePicker } = DatePicker;

const NormalRouteBuilder = ({ onSearch, isLoading, errors, cachedApiKey, saveApiKey }) => {
  const [path, setPath] = useState('');
  const [sourcesExcluded, setSourcesExcluded] = useState([]);
  const [apiKey, setApiKey] = useState('');
  const [dateRange, setDateRange] = useState(null);
  const [flightData, setFlightData] = useState(null);
  const [currentRoute, setCurrentRoute] = useState([]);

  // Load the cached API key when the component mounts
  useEffect(() => {
    if (cachedApiKey) {
      setApiKey(cachedApiKey);
    }
  }, [cachedApiKey]);

  // Update the cached API key when it changes
  const handleApiKeyChange = (e) => {
    const newApiKey = e.target.value;
    setApiKey(newApiKey);
    saveApiKey(newApiKey);
  };

  const handleSearch = () => {
    if (!path) {
      return;
    }

    console.log('🔍 NormalRouteBuilder - Path to search:', path);
    console.log('🔍 NormalRouteBuilder - Path type:', typeof path);

    // Split path into segments for the calendar
    setCurrentRoute(path.split(/[/-]/));

    onSearch({
      path,
      sourcesExcluded,
      apiKey,
      dateRange: dateRange ? [dateRange[0].format('YYYY-MM-DD'), dateRange[1].format('YYYY-MM-DD')] : null
    });
  };

  return (
    <>
      <Card className="normal-route-builder">
        <Row gutter={[16, 16]} className="form-row">
          {/* Path Input */}
          <Col flex="10">
            <div className="form-item">
              <div className="element-label">Path:</div>
              <HybridPathInput
                value={path}
                onChange={setPath}
                placeholder="Enter path (e.g. NRT/HND-OAK/SFO-JFK/EWR)"
              />
            </div>
          </Col>

          {/* Sources Excluded */}
          <Col flex="1">
            <div className="form-item">
              <div className="element-label">Sources Excluded:</div>
              <SourcesExcludedInput
                value={sourcesExcluded}
                onChange={setSourcesExcluded}
              />
            </div>
          </Col>

          {/* API Key */}
          <Col flex="6">
            <div className="form-item">
              <div className="element-label">API Key:</div>
              <Input.Password
                value={apiKey}
                onChange={handleApiKeyChange}
                placeholder="Enter your API key"
              />
            </div>
          </Col>

          {/* Date Range */}
          <Col flex="6">
            <div className="form-item">
              <div className="element-label">Date Range:</div>
              <RangePicker
                value={dateRange}
                onChange={setDateRange}
                format="YYYY-MM-DD"
              />
            </div>
          </Col>

          {/* Search Button */}
          <Col flex="0 1 120px" className="search-button-col">
            <Button
              type="primary"
              onClick={handleSearch}
              disabled={!path || isLoading}
              loading={isLoading}
              className="search-button"
              icon={<SearchOutlined />}
            >
              Search
            </Button>
          </Col>
        </Row>
        
        {/* Error messages */}
        {errors && errors.path && (
          <div style={{ color: 'red', marginTop: '8px' }}>{errors.path}</div>
        )}
        {errors && errors.general && (
          <div style={{ color: 'red', marginTop: '8px' }}>{errors.general}</div>
        )}
      </Card>

      {flightData && (
        <Card style={{ marginTop: '24px' }}>
          <NormalFlightAvailabilityCalendar
            flightData={flightData}
            currentRoute={currentRoute}
            onDateRangeSelect={(range) => setDateRange([dayjs(range[0]), dayjs(range[1])])}
            selectedRange={dateRange}
          />
        </Card>
      )}
    </>
  );
};

export default NormalRouteBuilder; 