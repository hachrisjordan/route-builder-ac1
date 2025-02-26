import { useState, useEffect, useRef, useMemo } from 'react';
import dayjs from 'dayjs';
import routeDetails from '../../../data/route_details.json';
import airlines from '../../../data/airlines';
import { getSegmentColumns } from '../segmentColumns';

export default function useFlightDetails(getColumns, initialCombinations = []) {
  const [selectedDates, setSelectedDates] = useState(null);
  const [apiKey, setApiKey] = useState('');
  const [segmentDetails, setSegmentDetails] = useState([]);
  const [isLoadingSegments, setIsLoadingSegments] = useState(false);
  const [selectedFlights, setSelectedFlights] = useState({});
  const [validCombinations, setValidCombinations] = useState([]);
  const [processedSegments, setProcessedSegments] = useState([]);
  const [originalFlights, setOriginalFlights] = useState(null);
  const [originalCombinations] = useState(initialCombinations);
  const [processedFlights, setProcessedFlights] = useState(null);
  const [initialFlights, setInitialFlights] = useState(null);
  const combinationsRef = useRef([]);

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

  const processFlightData = (data, timeWindow, segmentIndex) => {
    const flights = {};
    const baseDate = dayjs(data.results?.[0]?.data?.data?.[0]?.DepartsAt || new Date()).format('YYYY-MM-DD');
    
    const rawFlights = data.results?.[0]?.data?.data || [];
    console.log(`\nProcessing ${rawFlights.length} raw flights:`);
    
    if (timeWindow) {
      console.log('Time Window:', {
        start: timeWindow.start.format('YYYY-MM-DD HH:mm'),
        end: timeWindow.end.format('YYYY-MM-DD HH:mm')
      });
    }
    
    rawFlights
      .filter(trip => {
        console.log(`\nChecking flight ${trip.FlightNumbers}:`);
        console.log(`  Carrier: ${trip.Carriers}`);
        console.log(`  Departs: ${dayjs(trip.DepartsAt).format('YYYY-MM-DD HH:mm')}`);
        console.log(`  Arrives: ${dayjs(trip.ArrivesAt).format('YYYY-MM-DD HH:mm')}`);
        
        // Filter out non-direct flights
        if (trip.Stops !== 0) {
          console.log('  ❌ Skipped: Not a direct flight');
          return false;
        }
        
        // Filter out EK and FZ carriers
        if (trip.Carriers === 'EK' || trip.Carriers === 'FZ') {
          console.log('  ❌ Skipped: Excluded carrier');
          return false;
        }
        
        if (timeWindow) {
          const departureTime = dayjs(trip.DepartsAt);
          const isValid = departureTime.isAfter(timeWindow.start) && 
                         departureTime.isBefore(timeWindow.end);
          
          if (!isValid) {
            console.log('  ❌ Skipped: Outside time window');
            console.log(`    Must depart between ${timeWindow.start.format('YYYY-MM-DD HH:mm')} and ${timeWindow.end.format('YYYY-MM-DD HH:mm')}`);
          } else {
            console.log('  ✓ Accepted: Within time window');
          }
          return isValid;
        }
        
        console.log('  ✓ Accepted: No time window restrictions');
        return true;
      })
      .forEach(trip => {
        const flightNumber = trip.FlightNumbers;
        const departureTime = dayjs(trip.DepartsAt.replace('Z', ''));
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
        const departDayDiff = departureTime.diff(baseDayjs, 'day');
        const arrivalDayDiff = arrivalTime.diff(baseDayjs, 'day');

        // Process aircraft name
        let aircraftName = trip.Aircraft[0];
        if (aircraftName && aircraftName === '787  All') {
          aircraftName = 'Boeing 787-10';
        }

        flights[flightNumber] = {
          from: trip.OriginAirport,
          to: trip.DestinationAirport,
          flightNumber: flightNumber,
          airlines: getAirlineName(trip.Carriers),
          aircraft: aircraftName,
          duration: trip.TotalDuration,
          departs: departDayDiff > 0 ? 
            `${departureTime.format('HH:mm')} (+${departDayDiff})` : 
            departureTime.format('HH:mm'),
          arrives: arrivalDayDiff > 0 ? 
            `${arrivalTime.format('HH:mm')} (+${arrivalDayDiff})` : 
            arrivalTime.format('HH:mm'),
          DepartsAt: departureTime.format('YYYY-MM-DD HH:mm:ss'),
          ArrivesAt: arrivalTime.format('YYYY-MM-DD HH:mm:ss'),
          economy: false,
          business: false,
          first: false,
          isSelected: false,
          segmentIndex: segmentIndex
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

  const handleDateSearch = async (currentRoute) => {
    if (!selectedDates || !currentRoute || !apiKey) return;
    
    setIsLoadingSegments(true);
    const newProcessedSegments = [];
    const [startDate, endDate] = selectedDates;
    const baseDate = dayjs(startDate).format('YYYY-MM-DD');
    
    console.log('\n=== Processing Segments ===');
    console.log('Date Range:', {
      start: dayjs(startDate).format('YYYY-MM-DD'),
      end: dayjs(endDate).format('YYYY-MM-DD')
    });
    
    try {
      // Process all segments
      for (let i = 0; i < currentRoute.length - 1; i++) {
        const from = currentRoute[i];
        const to = currentRoute[i + 1];
        
        console.log(`\n=== Segment ${i + 1}: ${from}-${to} ===`);
        
        let timeWindow = null;
        const dates = new Set();

        if (i === 0) {
          // First segment - use full date range
          const startDay = dayjs(startDate).startOf('day');
          const endDay = dayjs(endDate).endOf('day');
          
          console.log('\n=== First Segment Details ===');
          console.log('Time Window: 00:00 on first date to 23:59 on last date');
          console.log(`From: ${startDay.format('YYYY-MM-DD')} 00:00`);
          console.log(`To: ${endDay.format('YYYY-MM-DD')} 23:59`);
          
          // Get all dates in range
          for (let d = startDay; d.valueOf() <= endDay.valueOf(); d = d.add(1, 'day')) {
            dates.add(d.format('YYYY-MM-DD'));
          }
        } else {
          // Handle subsequent segments
          const prevSegment = newProcessedSegments[i - 1];
          
          // If no previous flights found, use full date range for all segments
          if (!prevSegment || prevSegment.flights.length === 0) {
            const startDay = dayjs(startDate).startOf('day');
            const endDay = dayjs(endDate).endOf('day');
            for (let d = startDay; d.valueOf() <= endDay.valueOf(); d = d.add(1, 'day')) {
              dates.add(d.format('YYYY-MM-DD'));
            }
            console.log('No previous flights found. Using full date range for this segment');
          } else {
            // Calculate time window from previous segment's flights
            const arrivals = prevSegment.flights.map(f => dayjs(f.ArrivesAt));
            arrivals.sort((a, b) => a.valueOf() - b.valueOf());
            
            timeWindow = {
              start: arrivals[0],
              end: arrivals[arrivals.length - 1].add(24, 'hours')
            };
            
            // Get dates for time window
            for (let d = dayjs(timeWindow.start); d.valueOf() <= timeWindow.end.valueOf(); d = d.add(1, 'day')) {
              dates.add(d.format('YYYY-MM-DD'));
            }
            
            console.log('Time Window based on previous segment arrivals:');
            console.log('  Start:', timeWindow.start.format('YYYY-MM-DD HH:mm'));
            console.log('  End:', timeWindow.end.format('YYYY-MM-DD HH:mm'));
          }
        }

        // Process each date
        const allFlights = [];
        for (const date of dates) {
          const route = routeDetails.find(r => 
            r.origin === from && 
            r.destination === to &&
            r.date === date
          );

          if (!route) {
            console.log(`No route found for ${from}-${to} on ${date}`);
            continue;
          }

          console.log(`\nFetching ${from}-${to} for ${date}:`);
          console.log(`Segment ID: ${route.ID}`);
          
          try {
            const response = await fetch(`https://backend-284998006367.us-central1.run.app/api/seats/${route.ID}`, {
              method: 'GET',
              headers: {
                'accept': 'application/json',
                'Partner-Authorization': apiKey,
                'Segment-ID': route.ID
              }
            });

            if (!response.ok) {
              console.log(`❌ Failed to fetch ${from}-${to} (ID: ${route.ID})`);
              continue;
            }

            const data = await response.json();
            const processedFlights = processFlightData(data, timeWindow, i);
            console.log(`✓ Found ${processedFlights.length} valid flights`);
            allFlights.push(...processedFlights);
          } catch (error) {
            console.error(`Error processing ${from}-${to} for ${date}:`, error);
          }
        }

        console.log(`\nTotal flights found for ${from}-${to}: ${allFlights.length}`);

        // Store searched dates in segment data
        newProcessedSegments[i] = {
          route: `${from}-${to}`,
          flights: allFlights,
          searchDates: dates, // Add this field
          earliestArrival: allFlights.length > 0 ? dayjs(allFlights[0].ArrivesAt) : null,
          latestArrival: allFlights.length > 0 ? dayjs(allFlights[allFlights.length - 1].ArrivesAt) : null
        };

        // Only break if previous segment had flights but current segment found none
        if (allFlights.length === 0 && i > 0 && newProcessedSegments[i-1].flights.length > 0) {
          console.log(`\nNo flights found for segment ${from}-${to} after successful previous segment`);
          console.log('Skipping remaining segments');
          break;
        }
      }

      // After processing all segments
      if (newProcessedSegments.length >= 2) {
        console.log('\n=== Flight Combinations ===');
        
        // Find all valid combinations recursively
        const findValidCombinations = (currentPath = [], segmentIndex = 0) => {
          // If we've processed all segments, this is a valid combination
          if (segmentIndex === newProcessedSegments.length) {
            return [currentPath];
          }

          const validCombos = [];
          const currentSegment = newProcessedSegments[segmentIndex];

          // For the first segment, try all flights
          if (segmentIndex === 0) {
            currentSegment.flights.forEach(flight => {
              const combos = findValidCombinations([flight], segmentIndex + 1);
              validCombos.push(...combos);
            });
          } 
          // For subsequent segments, check connection times
          else {
            const previousFlight = currentPath[currentPath.length - 1];
            const previousArrival = dayjs(previousFlight.ArrivesAt);

            currentSegment.flights.forEach(flight => {
              const departure = dayjs(flight.DepartsAt);
              const connectionTime = departure.diff(previousArrival, 'minutes');

              // Check if this is a valid connection (between 1 hour and 24 hours)
              if (connectionTime >= 60 && connectionTime <= 24 * 60) {
                const combos = findValidCombinations([...currentPath, flight], segmentIndex + 1);
                validCombos.push(...combos);
              }
            });
          }

          return validCombos;
        };

        // Get all valid combinations
        const allCombinations = findValidCombinations();
        
        // Log the combinations
        allCombinations.forEach(combo => {
          const flightInfo = combo.map((flight, idx) => {
            if (idx === 0) return `${flight.flightNumber} (${dayjs(flight.DepartsAt).format('MM-DD')})`;
            
            const prevFlight = combo[idx - 1];
            const connectionTime = dayjs(flight.DepartsAt).diff(dayjs(prevFlight.ArrivesAt), 'minutes');
            const hours = Math.floor(connectionTime / 60);
            const minutes = connectionTime % 60;
            return `${flight.flightNumber} (${dayjs(flight.DepartsAt).format('MM-DD')}) (${hours}:${minutes.toString().padStart(2, '0')})`;
          });
          
          console.log(flightInfo.join(', '));
        });

        console.log('======================');

        // Create a set of valid flights from unique combinations
        const validFlights = new Set();
        allCombinations.forEach(combo => {
          combo.forEach((flight, segmentIndex) => {
            // Include segment index in the key to allow same flight number in different segments
            validFlights.add(`${flight.flightNumber}_${dayjs(flight.DepartsAt).format('YYYY-MM-DD HH:mm')}_${segmentIndex}`);
          });
        });

        // Filter and deduplicate flights
        const filteredFlights = newProcessedSegments.flatMap((segment, segmentIndex) => {
          const seenInSegment = new Set(); // Track duplicates within segment
          return segment.flights.filter(flight => {
            const flightKey = `${flight.flightNumber}_${dayjs(flight.DepartsAt).format('YYYY-MM-DD HH:mm')}_${segmentIndex}`;
            
            // Only keep the first occurrence of each flight in a segment
            if (!seenInSegment.has(flightKey)) {
              seenInSegment.add(flightKey);
              return validFlights.has(flightKey);
            }
            return false;
          }).map(flight => ({
            ...flight,
            isSelected: false,
            segmentIndex
          }));
        });

        setSegmentDetails(filteredFlights);
        setValidCombinations(allCombinations);

        // Log flights by segment
        console.log('\n=== Flights By Segment ===');
        const flightsBySegment = new Map();
        filteredFlights.forEach(flight => {
          const route = `${flight.from}-${flight.to}`;
          if (!flightsBySegment.has(route)) {
            flightsBySegment.set(route, new Set());
          }
          flightsBySegment.get(route).add(
            `${flight.flightNumber} (${dayjs(flight.DepartsAt).format('MM-DD HH:mm')})`
          );
        });

        flightsBySegment.forEach((flights, route) => {
          console.log(`\n${route}:`);
          Array.from(flights).sort().forEach(flight => {
            console.log(`  ${flight}`);
          });
        });
        
        console.log('\n======================');
      } else {
        setSegmentDetails(newProcessedSegments.flatMap((segment, index) => 
          segment.flights.map(flight => ({
            ...flight,
            isSelected: false,
            segmentIndex: index
          }))
        ));
      }
    } catch (error) {
      console.error('Error fetching segment details:', error);
    } finally {
      setIsLoadingSegments(false);
    }
  };

  const resetDetails = () => {
    setSelectedDates(null);
    setApiKey('');
    setSegmentDetails([]);
  };

  const handleFlightSelect = (flight, segmentIndex) => {
    const flightKey = `${flight.flightNumber}_${dayjs(flight.DepartsAt).format('YYYY-MM-DD')}`;
    console.log('Selected flight:', flightKey, 'from segment:', segmentIndex);
    
    // Create new selected flights object
    const newSelected = { ...selectedFlights };
    
    // Toggle selection
    if (newSelected[segmentIndex] && 
        `${newSelected[segmentIndex].flightNumber}_${dayjs(newSelected[segmentIndex].DepartsAt).format('YYYY-MM-DD')}` === flightKey) {
      delete newSelected[segmentIndex];
      console.log('Deselected flight');
    } else {
      newSelected[segmentIndex] = flight;
      console.log('Selected flight');
    }
    
    setSelectedFlights(newSelected);
    
    if (Object.keys(newSelected).length > 0) {
      // Find ALL valid combinations that include the selected flight
      const validCombos = validCombinations.filter(combo => {
        const selectedFlight = combo[segmentIndex];
        return selectedFlight.flightNumber === flight.flightNumber &&
               dayjs(selectedFlight.DepartsAt).isSame(dayjs(flight.DepartsAt));
      });

      console.log(`Found ${validCombos.length} valid combinations with ${flight.flightNumber}`);

      // Get all valid flights from these combinations
      const validFlights = new Set();
      validCombos.forEach(combo => {
        combo.forEach((f, idx) => {
          validFlights.add(`${f.flightNumber}_${dayjs(f.DepartsAt).format('YYYY-MM-DD HH:mm')}_${idx}`);
        });
      });

      // Deduplicate and update segment details
      const filteredFlights = validCombos.flatMap(combo => 
        combo.map((f, idx) => ({
          ...f,
          isSelected: idx === segmentIndex && f.flightNumber === flight.flightNumber,
          segmentIndex: idx
        }))
      );

      // Remove duplicates while preserving order
      const seenFlights = new Set();
      const uniqueFlights = filteredFlights.filter(f => {
        const key = `${f.flightNumber}_${dayjs(f.DepartsAt).format('YYYY-MM-DD HH:mm')}_${f.segmentIndex}`;
        if (!seenFlights.has(key)) {
          seenFlights.add(key);
          return true;
        }
        return false;
      });

      setSegmentDetails(uniqueFlights);
    } else {
      // When deselecting, show all unique flights from valid combinations
      const allValidFlights = new Map(); // Use Map to track flights by segment
      
      validCombinations.forEach(combo => {
        combo.forEach((f, idx) => {
          const segmentKey = `${f.from}-${f.to}`;
          if (!allValidFlights.has(segmentKey)) {
            allValidFlights.set(segmentKey, new Map());
          }
          
          const flightKey = `${f.flightNumber}_${dayjs(f.DepartsAt).format('YYYY-MM-DD HH:mm')}`;
          if (!allValidFlights.get(segmentKey).has(flightKey)) {
            allValidFlights.get(segmentKey).set(flightKey, {
              ...f,
              isSelected: false,
              segmentIndex: idx
            });
          }
        });
      });

      // Flatten the Map of Maps into an array
      const resetFlights = Array.from(allValidFlights.values())
        .flatMap(segmentFlights => Array.from(segmentFlights.values()));
      
      console.log('\n=== Resetting to All Valid Flights ===');
      Array.from(allValidFlights.entries()).forEach(([route, flights]) => {
        console.log(`\n${route}:`);
        Array.from(flights.values())
          .sort((a, b) => dayjs(a.DepartsAt).valueOf() - dayjs(b.DepartsAt).valueOf())
          .forEach(f => console.log(`  ${f.flightNumber} (${dayjs(f.DepartsAt).format('MM-DD HH:mm')})`));
      });
      console.log('\n======================');

      setSegmentDetails(resetFlights);
    }
  };

  const columns = useMemo(() => {
    if (!selectedDates) return getColumns(handleFlightSelect);
    const [startDate] = selectedDates;
    return getColumns(handleFlightSelect, dayjs(startDate).startOf('day'));
  }, [handleFlightSelect, selectedDates, getColumns]);

  // Initialize with all flights from all combinations
  useEffect(() => {
    console.log('Updating combinations ref:', initialCombinations);
    combinationsRef.current = initialCombinations;
  }, [initialCombinations]);

  // Initialize segment details
  useEffect(() => {
    if (initialCombinations.length > 0) {
      const allFlights = initialCombinations.flatMap((combo, comboIndex) => 
        combo.map((f, idx) => ({
          ...f,
          isSelected: false,
          segmentIndex: idx
        }))
      );

      const uniqueFlights = Array.from(
        new Map(allFlights.map(f => [
          `${f.flightNumber}_${f.segmentIndex}_${dayjs(f.DepartsAt).format('YYYY-MM-DD HH:mm')}`,
          f
        ])).values()
      );

      setSegmentDetails(uniqueFlights);
    }
  }, [initialCombinations]);

  return {
    selectedDates,
    setSelectedDates,
    apiKey,
    setApiKey,
    segmentDetails,
    isLoadingSegments,
    handleDateSearch,
    resetDetails,
    selectedFlights,
    setSelectedFlights,
    validCombinations,
    setValidCombinations,
    handleFlightSelect,
    columns
  };
} 