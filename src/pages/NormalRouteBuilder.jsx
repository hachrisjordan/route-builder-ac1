import React, { useState } from 'react';
import { Card } from 'antd';
import SearchForm from '../components/FlightSearch/SearchForm';
import ResultsTable from '../components/FlightSearch/ResultsTable';
import FlightDetailsModal from '../components/FlightSearch/FlightDetailsModal';
import useNormalFlightSearch from '../components/FlightSearch/hooks/useNormalFlightSearch';

const NormalRouteBuilder = () => {
  const {
    searchResults,
    isLoading,
    handleSearch,
    pagination,
    handleTableChange,
    errors,
  } = useNormalFlightSearch();

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
          width: 100%;
          margin: 20px auto;
          padding: 0 12px;
          box-sizing: border-box;
        }
        :global(.ant-table-wrapper) {
          margin: 0;
          width: 100%;
          overflow-x: auto;
        }
        :global(.ant-card) {
          margin-bottom: 20px;
          width: 100%;
        }
        :global(.ant-modal) {
          max-width: 100vw;
          margin: 0;
        }
        :global(.ant-modal-content) {
          max-height: 100vh;
          border-radius: 8px;
        }
        @media (max-width: 768px) {
          .flight-search-container {
            padding: 0 8px;
            margin: 12px auto;
          }
          :global(.ant-modal-content) {
            border-radius: 0;
          }
        }
      `}</style>
    </div>
  );
};

export default NormalRouteBuilder;