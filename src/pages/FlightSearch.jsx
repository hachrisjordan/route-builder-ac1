import React, { useState } from 'react';
import { Card } from 'antd';
import SearchForm from '../components/FlightSearch/SearchForm';
import ResultsTable from '../components/FlightSearch/ResultsTable';
import FlightDetailsModal from '../components/FlightSearch/FlightDetailsModal';
import useFlightSearch from '../components/FlightSearch/hooks/useFlightSearch';

const FlightSearch = () => {
  const {
    searchResults,
    isLoading,
    handleSearch,
    pagination,
    handleTableChange,
    errors,
  } = useFlightSearch();

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [currentRoute, setCurrentRoute] = useState(null);

  return (
    <div className="flight-search-container">
      <SearchForm 
        onSearch={handleSearch}
        isLoading={isLoading}
        errors={errors}
      />

      {searchResults && (
        <ResultsTable
          searchResults={searchResults}
          isLoading={isLoading}
          pagination={pagination}
          onTableChange={handleTableChange}
          onRouteSelect={(route) => {
            setCurrentRoute(route);
            setIsModalVisible(true);
          }}
        />
      )}

      <FlightDetailsModal
        isVisible={isModalVisible}
        currentRoute={currentRoute}
        onClose={() => {
          setIsModalVisible(false);
          setCurrentRoute(null);
        }}
      />

      <style jsx>{`
        .flight-search-container {
          max-width: 1200px;
          margin: 20px auto;
          padding: 0 20px;
        }
        :global(.ant-table-wrapper) {
          margin: 0;
          width: 100%;
        }
        :global(.ant-card) {
          margin-bottom: 20px;
        }
        :global(.ant-table-container) {
          overflow-x: auto;
        }
      `}</style>
    </div>
  );
};

export default FlightSearch;