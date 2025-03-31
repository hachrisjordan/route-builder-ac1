import React from 'react';
import { Radio, Input, Checkbox, Tooltip } from 'antd';
import { isValidSegmentForRoute } from './flightUtils';

// Render origin filter dropdown for group-based filter
export const renderOriginDropdown = (filterId, groupFilters, setGroupFilters, originSearchText, setOriginSearchText, groupFilterOptions) => {
  const currentFilter = groupFilters[filterId] || { originFilter: { mode: 'include', airports: [] } };
  
  // Filter options based on search text
  const filteredOptions = groupFilterOptions.originOptions.filter(option => 
    option.code.toLowerCase().includes(originSearchText.toLowerCase()) ||
    option.name.toLowerCase().includes(originSearchText.toLowerCase())
  );

  return (
    <div style={{ 
      backgroundColor: 'white', 
      boxShadow: '0 3px 6px -4px rgba(0,0,0,.12), 0 6px 16px 0 rgba(0,0,0,.08), 0 9px 28px 8px rgba(0,0,0,.05)',
      borderRadius: '8px',
      padding: '8px 0',
      width: '450px'
    }}>
      <div style={{ padding: '4px 12px 8px', borderBottom: '1px solid #f0f0f0' }}>
        <Radio.Group
          value={currentFilter.originFilter.mode}
          onChange={e => setGroupFilters(prev => ({
            ...prev,
            [filterId]: {
              ...prev[filterId],
              originFilter: {
                ...prev[filterId].originFilter,
                mode: e.target.value
              }
            }
          }))}
          style={{ display: 'flex', gap: '8px' }}
        >
          <Radio.Button 
            value="include" 
            style={{ flex: 1, textAlign: 'center' }}
          >
            Include
          </Radio.Button>
          <Radio.Button 
            value="exclude" 
            style={{ flex: 1, textAlign: 'center' }}
          >
            Exclude
          </Radio.Button>
        </Radio.Group>
      </div>
      <div style={{ padding: '8px 12px', borderBottom: '1px solid #f0f0f0' }}>
        <Input
          placeholder="Search origin airports/groups..."
          value={originSearchText}
          onChange={e => setOriginSearchText(e.target.value)}
          size="small"
          allowClear
          onClick={e => e.stopPropagation()}
        />
      </div>
      <div style={{ 
        maxHeight: '400px', 
        overflowY: 'auto',
        padding: '8px 0'
      }}>
        {filteredOptions.map(option => (
          <div 
            key={option.code} 
            style={{ 
              padding: '4px 12px',
              cursor: 'pointer'
            }}
          >
            <Checkbox
              checked={currentFilter.originFilter.airports.includes(option.code)}
              onChange={e => {
                const isChecked = e.target.checked;
                setGroupFilters(prev => ({
                  ...prev,
                  [filterId]: {
                    ...prev[filterId],
                    originFilter: {
                      ...prev[filterId].originFilter,
                      airports: isChecked 
                        ? [...prev[filterId].originFilter.airports, option.code]
                        : prev[filterId].originFilter.airports.filter(a => a !== option.code)
                    }
                  }
                }));
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', width: '390px' }}>
                <span style={{ fontWeight: 500 }}>{option.code}</span>
                <span style={{ 
                  fontSize: '12px', 
                  color: '#666',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis' 
                }}>
                  {option.name}
                </span>
              </div>
            </Checkbox>
          </div>
        ))}
        {filteredOptions.length === 0 && (
          <div style={{ padding: '8px 12px', color: '#999', textAlign: 'center' }}>
            No options found
          </div>
        )}
      </div>
    </div>
  );
};

// Render destination filter dropdown for group-based filter
export const renderDestDropdown = (filterId, groupFilters, setGroupFilters, destSearchText, setDestSearchText, groupFilterOptions) => {
  const currentFilter = groupFilters[filterId] || { destFilter: { mode: 'include', airports: [] } };
  
  // Filter options based on search text
  const filteredOptions = groupFilterOptions.destOptions.filter(option => 
    option.code.toLowerCase().includes(destSearchText.toLowerCase()) ||
    option.name.toLowerCase().includes(destSearchText.toLowerCase())
  );

  return (
    <div style={{ 
      backgroundColor: 'white', 
      boxShadow: '0 3px 6px -4px rgba(0,0,0,.12), 0 6px 16px 0 rgba(0,0,0,.08), 0 9px 28px 8px rgba(0,0,0,.05)',
      borderRadius: '8px',
      padding: '8px 0',
      width: '450px'
    }}>
      <div style={{ padding: '4px 12px 8px', borderBottom: '1px solid #f0f0f0' }}>
        <Radio.Group
          value={currentFilter.destFilter.mode}
          onChange={e => setGroupFilters(prev => ({
            ...prev,
            [filterId]: {
              ...prev[filterId],
              destFilter: {
                ...prev[filterId].destFilter,
                mode: e.target.value
              }
            }
          }))}
          style={{ display: 'flex', gap: '8px' }}
        >
          <Radio.Button 
            value="include" 
            style={{ flex: 1, textAlign: 'center' }}
          >
            Include
          </Radio.Button>
          <Radio.Button 
            value="exclude" 
            style={{ flex: 1, textAlign: 'center' }}
          >
            Exclude
          </Radio.Button>
        </Radio.Group>
      </div>
      <div style={{ padding: '8px 12px', borderBottom: '1px solid #f0f0f0' }}>
        <Input
          placeholder="Search destination airports/groups..."
          value={destSearchText}
          onChange={e => setDestSearchText(e.target.value)}
          size="small"
          allowClear
          onClick={e => e.stopPropagation()}
        />
      </div>
      <div style={{ 
        maxHeight: '400px', 
        overflowY: 'auto',
        padding: '8px 0'
      }}>
        {filteredOptions.map(option => (
          <div 
            key={option.code} 
            style={{ 
              padding: '4px 12px',
              cursor: 'pointer'
            }}
          >
            <Checkbox
              checked={currentFilter.destFilter.airports.includes(option.code)}
              onChange={e => {
                const isChecked = e.target.checked;
                setGroupFilters(prev => ({
                  ...prev,
                  [filterId]: {
                    ...prev[filterId],
                    destFilter: {
                      ...prev[filterId].destFilter,
                      airports: isChecked 
                        ? [...prev[filterId].destFilter.airports, option.code]
                        : prev[filterId].destFilter.airports.filter(a => a !== option.code)
                    }
                  }
                }));
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', width: '390px' }}>
                <span style={{ fontWeight: 500 }}>{option.code}</span>
                <span style={{ 
                  fontSize: '12px', 
                  color: '#666',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis' 
                }}>
                  {option.name}
                </span>
              </div>
            </Checkbox>
          </div>
        ))}
        {filteredOptions.length === 0 && (
          <div style={{ padding: '8px 12px', color: '#999', textAlign: 'center' }}>
            No options found
          </div>
        )}
      </div>
    </div>
  );
};

// Simplified segment dropdown (no reordering, include only)
export const renderSegmentsDropdownSimple = (filterId, segmentFilters, setSegmentFilters, segmentSearchText, setSegmentSearchText, uniqueSegments, currentRoute) => {
  const currentFilter = segmentFilters[filterId] || { segments: [] };
  
  // Count total segments
  const totalSegmentsCount = uniqueSegments.length;
  
  // Filter segments to only include valid routes for the current search
  const validSegments = uniqueSegments.filter(segment => 
    isValidSegmentForRoute(segment, currentRoute)
  );
  
  // Count how many were filtered out
  const invalidSegmentsCount = totalSegmentsCount - validSegments.length;
  
  // Then filter by search text
  const filteredSegments = validSegments.filter(segment => 
    segment.toLowerCase().includes(segmentSearchText.toLowerCase())
  );

  return (
    <div style={{ 
      backgroundColor: 'white', 
      boxShadow: '0 3px 6px -4px rgba(0,0,0,.12), 0 6px 16px 0 rgba(0,0,0,.08), 0 9px 28px 8px rgba(0,0,0,.05)',
      borderRadius: '8px',
      padding: '8px 0',
      width: '320px'
    }}>
      <div style={{ padding: '8px 12px', borderBottom: '1px solid #f0f0f0' }}>
        <Input
          placeholder="Search segments..."
          value={segmentSearchText}
          onChange={e => setSegmentSearchText(e.target.value)}
          size="small"
          allowClear
          onClick={e => e.stopPropagation()}
        />
      </div>
      
      {invalidSegmentsCount > 0 && (
        <div style={{ 
          padding: '4px 12px', 
          fontSize: '11px', 
          color: '#ff4d4f', 
          backgroundColor: '#fff1f0',
          marginBottom: '4px',
          borderBottom: '1px solid #f0f0f0' 
        }}>
          {invalidSegmentsCount} invalid segment(s) hidden for current route
        </div>
      )}
      
      <div style={{ 
        maxHeight: '400px', 
        overflowY: 'auto',
        padding: '8px 0'
      }}>
        {filteredSegments.map(segment => (
          <div 
            key={segment} 
            style={{ 
              padding: '4px 12px',
              cursor: 'pointer'
            }}
          >
            <Checkbox
              checked={currentFilter.segments.includes(segment)}
              onChange={e => {
                const isChecked = e.target.checked;
                setSegmentFilters(prev => ({
                  ...prev,
                  [filterId]: {
                    ...prev[filterId],
                    segments: isChecked 
                      ? [...(prev[filterId]?.segments || []), segment]
                      : (prev[filterId]?.segments || []).filter(s => s !== segment)
                  }
                }));
              }}
            >
              {segment}
            </Checkbox>
          </div>
        ))}
        {filteredSegments.length === 0 && (
          <div style={{ padding: '8px 12px', color: '#999', textAlign: 'center' }}>
            No valid segments found
          </div>
        )}
      </div>
    </div>
  );
}; 