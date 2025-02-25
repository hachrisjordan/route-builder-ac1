import React, { useState, useEffect } from 'react';
import { Select, InputNumber, Button, Table, Card, Tag, Spin, Input, Modal, DatePicker } from 'antd';
import { SearchOutlined, DownOutlined, CheckOutlined } from '@ant-design/icons';
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
    
    // If time is before 12:00 and it's a flight arrival, it's likely next day
    const dayDiff = date.hour() < 12 && date.format('HH:mm') < '12:00' ? 1 : 0;
    
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
    const processedSegments = [];
    const baseDate = selectedDates.format('YYYY-MM-DD');
    
    try {
      // Process all segments first
      for (let i = 0; i < currentRoute.length - 1; i++) {
        const from = currentRoute[i];
        const to = currentRoute[i + 1];
        const prevSegment = processedSegments[i - 1];
        
        let timeWindow = null;
        if (prevSegment) {
          if (prevSegment.flights.length === 0) {
            const prevFrom = currentRoute[i - 1];
            const prevTo = currentRoute[i];
            const prevDistance = getSegmentDistance(prevFrom, prevTo);
            const minConnectionHours = Math.ceil(prevDistance / 575);
            
            const baseTime = prevSegment.earliestArrival || dayjs(baseDate);
            const endTime = prevSegment.latestArrival || baseTime;
            
            timeWindow = {
              earliestDeparture: baseTime.add(minConnectionHours, 'hour'),
              latestDeparture: endTime.add(24, 'hour').add(minConnectionHours, 'hour')
            };
          } else {
            timeWindow = {
              earliestDeparture: prevSegment.earliestArrival,
              latestDeparture: prevSegment.latestArrival.add(24, 'hour')
            };
          }
        }

        const segment = await processSegment(from, to, baseDate, timeWindow);
        processedSegments.push(segment);
      }

      // Now revisit first segment and filter out invalid connections
      if (processedSegments.length >= 2 && processedSegments[1].flights.length > 0) {
        console.log('\nRevising first segment based on second segment departures:');
        const firstSegment = processedSegments[0];
        const secondSegment = processedSegments[1];
        
        const earliestSecondDeparture = secondSegment.flights
          .map(f => dayjs(f.DepartsAt))
          .reduce((earliest, curr) => earliest.isBefore(curr) ? earliest : curr);
        
        console.log(`  Second segment earliest departure: ${earliestSecondDeparture.format('YYYY-MM-DD HH:mm')}`);
        
        firstSegment.flights = firstSegment.flights.filter(flight => {
          const arrivalTime = dayjs(flight.ArrivesAt);
          const arrivalDate = arrivalTime.format('YYYY-MM-DD');
          const departureDate = earliestSecondDeparture.format('YYYY-MM-DD');
          
          // If arrival is on an earlier date, keep it
          if (arrivalDate < departureDate) {
            console.log(`  Checking ${flight.flightNumber}: arrives ${arrivalTime.format('YYYY-MM-DD HH:mm')} - keep (earlier date)`);
            return true;
          }
          
          // If same date, compare times
          if (arrivalDate === departureDate) {
            const isValid = arrivalTime.isBefore(earliestSecondDeparture);
            console.log(`  Checking ${flight.flightNumber}: arrives ${arrivalTime.format('YYYY-MM-DD HH:mm')} - ${isValid ? 'keep' : 'remove'} (same date)`);
            return isValid;
          }
          
          // If arrival is on a later date, remove it
          console.log(`  Checking ${flight.flightNumber}: arrives ${arrivalTime.format('YYYY-MM-DD HH:mm')} - remove (later date)`);
          return false;
        });

        // Update arrival bounds if needed
        if (firstSegment.flights.length > 0) {
          firstSegment.earliestArrival = dayjs(firstSegment.flights[0].ArrivesAt);
          firstSegment.latestArrival = dayjs(firstSegment.flights[firstSegment.flights.length - 1].ArrivesAt);
        } else {
          firstSegment.earliestArrival = null;
          firstSegment.latestArrival = null;
        }
      }

      setSegmentDetails(processedSegments.flatMap(segment => segment.flights));
    } catch (error) {
      console.error('Error fetching segment details:', error);
    } finally {
      setIsLoadingSegments(false);
    }
  };

  const processSegment = async (from, to, baseDate, timeWindow = null, nextSegmentFlights = null) => {
    const API_URL = 'https://backend-284998006367.us-central1.run.app';
    const dates = new Set();
    
    // Add base date
    dates.add(baseDate);
    
    // Add next day if time window extends to it
    if (timeWindow?.latestDeparture) {
      const nextDay = dayjs(baseDate).add(1, 'day').format('YYYY-MM-DD');
      if (timeWindow.latestDeparture.isAfter(dayjs(nextDay))) {
        dates.add(nextDay);
      }
    }

    const flights = [];
    let earliestArrival = null;
    let latestArrival = null;

    console.log(`Processing route ${from}-${to}:`);
    
    // Process each date
    for (const date of dates) {
      const route = routeDetails.find(r => 
        r.origin === from && 
        r.destination === to && 
        r.date === date
      );
      
      if (route) {
        console.log(`  Found segment ID ${route.ID} for date ${date}`);
        try {
          const response = await fetch(`${API_URL}/api/seats/${route.ID}`, {
            method: 'GET',
            headers: {
              'accept': 'application/json',
              'Partner-Authorization': apiKey,
              'Segment-ID': route.ID
            }
          });

          if (!response.ok) {
            console.log(`  Failed to fetch segment ${route.ID}: ${response.status}`);
            continue;
          }

          const data = await response.json();
          
          // For non-first segments, check if there are any next segment flights
          if (timeWindow && data.results?.[0]?.data?.data) {
            const nextSegmentFlights = data.results[0].data.data;
            if (nextSegmentFlights.length === 1) {
              const nextFlight = nextSegmentFlights[0];
              const nextDeparture = dayjs(nextFlight.DepartsAt.replace('Z', ''));
              
              // Add minimum connection time (e.g., 1 hour)
              const minConnectionTime = 1;
              const maxConnectionTime = 4; // Maximum 4 hours connection time
              
              // Modify timeWindow to only allow flights that make viable connections
              timeWindow = {
                earliestDeparture: timeWindow.earliestDeparture,
                latestDeparture: nextDeparture.subtract(minConnectionTime, 'hour'),
                nextFlightDeparture: nextDeparture,
                maxConnectionTime: maxConnectionTime
              };
              
              console.log(`  Adjusting time window for single next flight:
    Next flight departs: ${nextDeparture.format('YYYY-MM-DD HH:mm')}
    Must arrive by: ${timeWindow.latestDeparture.format('YYYY-MM-DD HH:mm')}
    Maximum connection time: ${maxConnectionTime} hours`);
            }
          }

          const validFlights = processFlightData(data, timeWindow);
          console.log(`  Segment ${route.ID}: Found ${validFlights.length} valid flights`);
          
          flights.push(...validFlights);

          // Update arrival time bounds
          validFlights.forEach(flight => {
            const arrivalTime = dayjs(flight.ArrivesAt);
            if (!earliestArrival || arrivalTime.isBefore(earliestArrival)) {
              earliestArrival = arrivalTime;
            }
            if (!latestArrival || arrivalTime.isAfter(latestArrival)) {
              latestArrival = arrivalTime;
            }
          });
        } catch (error) {
          console.error(`  Error fetching segment ${route.ID}:`, error);
        }
      } else {
        console.log(`  No segment found for ${from}-${to} on ${date}`);
      }
    }

    // If this is first segment and we have next segment data, get latest possible arrival
    let latestPossibleArrival = null;
    if (nextSegmentFlights && nextSegmentFlights.length > 0) {
      // Find earliest departure in next segment
      const earliestNextDeparture = nextSegmentFlights
        .map(f => dayjs(f.DepartsAt.replace('Z', '')))
        .reduce((earliest, curr) => earliest.isBefore(curr) ? earliest : curr);
      
      latestPossibleArrival = earliestNextDeparture;
      console.log(`  Latest possible arrival for connection: ${latestPossibleArrival.format('YYYY-MM-DD HH:mm')}`);
    }

    return {
      route: `${from}-${to}`,
      flights,
      earliestArrival,
      latestArrival
    };
  };

  const processFlightData = (data, timeWindow) => {
    const flights = {};
    const baseDate = selectedDates.format('YYYY-MM-DD');
    
    const rawFlights = data.results?.[0]?.data?.data || [];
    console.log(`  Processing ${rawFlights.length} raw flights`);
    
    rawFlights
      .filter(trip => {
        if (trip.Stops !== 0) {
          console.log(`  Skipping flight with ${trip.Stops} stops`);
          return false;
        }
        
        if (timeWindow) {
          const departureTime = dayjs(trip.DepartsAt.replace('Z', ''));  // Remove Z to treat as local time
          const isValid = departureTime.isAfter(timeWindow.earliestDeparture) && 
                         departureTime.isBefore(timeWindow.latestDeparture);
          
          if (!isValid) {
            console.log(`  Skipping flight outside time window: ${departureTime.format('YYYY-MM-DD HH:mm')}`);
          }
          return isValid;
        }
        
        return true;
      })
      .forEach(trip => {
        const flightNumber = trip.FlightNumbers;
        const departureTime = dayjs(trip.DepartsAt.replace('Z', '')); // Remove Z to treat as local time
        const existingFlight = flights[flightNumber];

        // If this is a duplicate flight, only keep the later one
        if (existingFlight) {
          const existingDeparture = dayjs(existingFlight.DepartsAt.replace('Z', '')); // Remove Z to treat as local time
          if (departureTime.isBefore(existingDeparture)) {
            return; // Skip this one, keep the existing later flight
          }
        }

        const arrivalTime = dayjs(trip.ArrivesAt.replace('Z', '')); // Remove Z to treat as local time
        const baseDayjs = dayjs(baseDate);
        
        // Calculate day difference from base date
        const departDayDiff = departureTime.diff(baseDayjs, 'day');
        const arrivalDayDiff = arrivalTime.diff(baseDayjs, 'day');

        flights[flightNumber] = {
          from: trip.OriginAirport,
          to: trip.DestinationAirport,
          flightNumber: flightNumber,
          airlines: getAirlineName(trip.Carriers),
          aircraft: trip.Aircraft[0],
          departs: departDayDiff > 0 ? 
            `${departureTime.format('HH:mm')} (+${departDayDiff})` : 
            departureTime.format('HH:mm'),
          arrives: arrivalDayDiff > 0 ? 
            `${arrivalTime.format('HH:mm')} (+${arrivalDayDiff})` : 
            arrivalTime.format('HH:mm'),
          DepartsAt: trip.DepartsAt.replace('Z', ''), // Store without Z
          ArrivesAt: trip.ArrivesAt.replace('Z', ''), // Store without Z
          economy: false,
          business: false,
          first: false
        };
        
        switch(trip.Cabin.toLowerCase()) {
          case 'economy':
            flights[flightNumber].economy = true;
            break;
          case 'business':
            flights[flightNumber].business = true;
            break;
          case 'first':
            flights[flightNumber].first = true;
            break;
        }
      });
    
    return Object.values(flights);
  };

  const getSegmentDistance = (from, to) => {
    const route = routeDetails.find(r => 
      r.origin === from && 
      r.destination === to
    );

    if (!route) {
      console.log(`Warning: No route found for ${from}-${to}, using default distance`);
      return 1000;
    }

    console.log(`Distance for ${from}-${to}: ${route.distance.toLocaleString()} miles`);
    return route.distance;
  };

  const segmentColumns = [
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
    { 
      title: 'Flight', 
      dataIndex: 'flightNumber', 
      width: 100,
      sorter: (a, b) => a.flightNumber.localeCompare(b.flightNumber)
    },
    { 
      title: 'Airlines', 
      dataIndex: 'airlines', 
      width: 150,
      sorter: (a, b) => a.airlines.localeCompare(b.airlines)
    },
    { 
      title: 'Aircraft', 
      dataIndex: 'aircraft', 
      width: 180,
      sorter: (a, b) => a.aircraft.localeCompare(b.aircraft)
    },
    { 
      title: 'Departs', 
      dataIndex: 'departs', 
      width: 100,
      sorter: (a, b) => {
        // Extract day difference
        const aDayDiff = a.departs.includes('+') ? 
          parseInt(a.departs.match(/\+(\d+)/)[1]) : 0;
        const bDayDiff = b.departs.includes('+') ? 
          parseInt(b.departs.match(/\+(\d+)/)[1]) : 0;
        
        // Extract time
        const aTime = a.departs.split(' ')[0];
        const bTime = b.departs.split(' ')[0];
        
        // Compare days first, then times
        if (aDayDiff !== bDayDiff) {
          return aDayDiff - bDayDiff;
        }
        return aTime.localeCompare(bTime);
      },
      defaultSortOrder: 'ascend'
    },
    { 
      title: 'Arrives', 
      dataIndex: 'arrives', 
      width: 100,
      sorter: (a, b) => {
        // Extract day difference
        const aDayDiff = a.arrives.includes('+') ? 
          parseInt(a.arrives.match(/\+(\d+)/)[1]) : 0;
        const bDayDiff = b.arrives.includes('+') ? 
          parseInt(b.arrives.match(/\+(\d+)/)[1]) : 0;
        
        // Extract time
        const aTime = a.arrives.split(' ')[0];
        const bTime = b.arrives.split(' ')[0];
        
        // Compare days first, then times
        if (aDayDiff !== bDayDiff) {
          return aDayDiff - bDayDiff;
        }
        return aTime.localeCompare(bTime);
      }
    },
    { 
      title: 'Economy', 
      dataIndex: 'economy', 
      width: 60,
      align: 'center',
      sorter: (a, b) => (a.economy === b.economy ? 0 : a.economy ? -1 : 1),
      render: hasClass => hasClass ? <CheckOutlined style={{ color: '#52c41a' }} /> : null
    },
    { 
      title: 'Business', 
      dataIndex: 'business', 
      width: 60,
      align: 'center',
      sorter: (a, b) => (a.business === b.business ? 0 : a.business ? -1 : 1),
      render: hasClass => hasClass ? <CheckOutlined style={{ color: '#52c41a' }} /> : null
    },
    { 
      title: 'First', 
      dataIndex: 'first', 
      width: 60,
      align: 'center',
      sorter: (a, b) => (a.first === b.first ? 0 : a.first ? -1 : 1),
      render: hasClass => hasClass ? <CheckOutlined style={{ color: '#52c41a' }} /> : null
    }
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
        width={1500}
        styles={{
          body: { 
            padding: '12px',
            maxWidth: '100%'
          }
        }}
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
        {isLoadingSegments ? (
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <Spin />
          </div>
        ) : (
          <div style={{ 
            width: '100%',
            overflowX: 'auto'
          }}>
            {currentRoute && currentRoute.slice(0, -1).map((from, index) => {
              const to = currentRoute[index + 1];
              const routeKey = `${from}-${to}`;
              const flights = segmentDetails.filter(flight => 
                flight.from === from && flight.to === to
              );

              return (
                <div key={routeKey} style={{ 
                  marginBottom: '24px',
                  width: '100%'
                }}>
                  <h3 style={{ marginBottom: '16px' }}>{routeKey}</h3>
                  <Table
                    dataSource={flights}
                    columns={segmentColumns}
                    size="small"
                    rowKey={(record, index) => `${routeKey}-${index}`}
                    sortDirections={['ascend', 'descend']}
                    style={{ 
                      width: '100%',
                      tableLayout: 'fixed'
                    }}
                    pagination={{
                      defaultPageSize: 10,
                      showSizeChanger: true,
                      showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} flights`,
                      pageSizeOptions: ['10', '20', '50', 'all'],
                      position: ['bottomRight']
                    }}
                    locale={{
                      emptyText: 'No flights available'
                    }}
                  />
                </div>
              );
            })}
          </div>
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