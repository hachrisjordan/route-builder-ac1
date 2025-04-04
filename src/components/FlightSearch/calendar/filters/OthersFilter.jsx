import React, { useEffect } from 'react';
import { Checkbox, Select } from 'antd';
import { currencyList } from '../data/currency_list';
import { fetchExchangeRates } from '../utils/currencyUtils';

const OthersFilter = ({
  currencyFilter,
  setCurrencyFilter,
}) => {
  // Transform currency list into options format for Select
  const currencyOptions = currencyList.map(currency => ({
    label: `${currency.code} - ${currency.name}`,
    value: currency.code
  }));

  // Fetch exchange rates when currency filter is enabled
  useEffect(() => {
    if (currencyFilter.enabled) {
      fetchExchangeRates().catch(console.error);
    }
  }, [currencyFilter.enabled]);

  return (
    <div style={{ 
      backgroundColor: 'white', 
      boxShadow: '0 3px 6px -4px rgba(0,0,0,.12), 0 6px 16px 0 rgba(0,0,0,.08), 0 9px 28px 8px rgba(0,0,0,.05)',
      borderRadius: '8px',
      padding: '8px 0',
      width: '320px'
    }}>
      <div style={{ 
        padding: '8px 12px', 
        borderBottom: '1px solid #f0f0f0',
        width: '100%',
        boxSizing: 'border-box'
      }}>
        <div style={{ marginBottom: '12px' }}>
          <Checkbox
            checked={currencyFilter.enabled}
            onChange={(e) => {
              setCurrencyFilter({
                ...currencyFilter,
                enabled: e.target.checked,
                selectedCurrency: e.target.checked ? (currencyFilter.selectedCurrency || 'USD') : null
              });
            }}
          >
            Select Currency
          </Checkbox>
        </div>
        {currencyFilter.enabled && (
          <div style={{ width: '100%' }}>
            <Select
              style={{ width: '100%', maxWidth: '296px' }}
              value={currencyFilter.selectedCurrency}
              onChange={(value) => {
                setCurrencyFilter({
                  ...currencyFilter,
                  selectedCurrency: value
                });
              }}
              options={currencyOptions}
              placeholder="Select a currency"
              size="small"
              showSearch
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default OthersFilter; 