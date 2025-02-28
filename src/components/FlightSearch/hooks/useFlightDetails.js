import { useState, useEffect, useRef, useMemo } from 'react';
import dayjs from 'dayjs';
import routeDetails from '../../../data/route_details.json';
import airlines from '../../../data/airlines';
import { getSegmentColumns } from '../segmentColumns';

export default function useFlightDetails(getColumns, initialCombinations = []) {
  const [selectedDates, setSelectedDates] = useState(null);
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('flightSearchApiKey') || '');
  const [segmentDetails, setSegmentDetails] = useState([]);
  const [isLoadingSegments, setIsLoadingSegments] = useState(false);
  const [selectedFlights, setSelectedFlights] = useState({});
  const [validCombinations, setValidCombinations] = useState([]);
  const [processedSegments, setProcessedSegments] = useState([]);
  const [originalFlights, setOriginalFlights] = useState(null);
  const [originalCombinations] = useState(initialCombinations);
  const [processedFlights, setProcessedFlights] = useState(null);
  const [initialFlights, setInitialFlights] = useState(null);
  const [availabilityData, setAvailabilityData] = useState({});
  const [isLoadingAvailability, setIsLoadingAvailability] = useState(false);
  const combinationsRef = useRef([]);

  // Update localStorage when apiKey changes
  useEffect(() => {
    if (apiKey) {
      localStorage.setItem('flightSearchApiKey', apiKey);
    }
  }, [apiKey]);

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
        // Convert CL carrier and flight numbers to LH
        const carrier = trip.Carriers === 'CL' ? 'LH' : trip.Carriers;
        const flightNumber = trip.FlightNumbers.startsWith('CL') 
          ? `LH${trip.FlightNumbers.slice(2)}` 
          : trip.FlightNumbers;

        const departureTime = dayjs(trip.DepartsAt.replace('Z', ''));
        const arrivalTime = dayjs(trip.ArrivesAt.replace('Z', '')); 
        const baseDayjs = dayjs(baseDate);
        const departDayDiff = departureTime.diff(baseDayjs, 'day');
        const arrivalDayDiff = arrivalTime.diff(baseDayjs, 'day');

        // If flight already exists, merge cabin classes
        if (flights[flightNumber]) {
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
          return; // Skip creating new flight entry
        }

        // Process aircraft name and create new flight entry
        let aircraftName = trip.Aircraft[0];
        if (aircraftName && aircraftName === '787  All') {
          aircraftName = 'Boeing 787-10';
        }

        flights[flightNumber] = {
          from: trip.OriginAirport,
          to: trip.DestinationAirport,
          flightNumber: flightNumber,
          airlines: getAirlineName(carrier),
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
          distance: parseInt(trip.Distance) || getSegmentDistance(trip.OriginAirport, trip.DestinationAirport),
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

  const isDateInRange = (dateStr, dateRange) => {
    if (!dateRange || !dateRange[0] || !dateRange[1]) return false;
    const date = dayjs(dateStr);
    const start = dayjs(dateRange[0]);
    const end = dayjs(dateRange[1]);
    return date.isAfter(start.subtract(1, 'day')) && 
           date.isBefore(end.add(1, 'day'));
  };

  const handleDateSearch = async (currentRoute) => {
    if (!selectedDates || !currentRoute || !apiKey) return;
    
    setIsLoadingSegments(true);
    setIsLoadingAvailability(true);
    setSelectedFlights({});
    
    try {
      const selectedSegments = [];
      for (const date of Object.keys(availabilityData)) {
        if (isDateInRange(date, selectedDates)) {
          // Preserve distance information when collecting segments
          const segments = availabilityData[date].map(segment => ({
            ...segment,
            distance: parseInt(segment.distance) || getSegmentDistance(segment.route.split('-')[0], segment.route.split('-')[1])
          }));
          selectedSegments.push(...segments);
        }
      }

      // Log selected segments before filtering
      console.log('=== Flights Before Combination Filtering ===');
      const segmentsByRoute = selectedSegments.reduce((acc, segment) => {
        if (!acc[segment.route]) {
          acc[segment.route] = [];
        }
        acc[segment.route].push(segment);
        return acc;
      }, {});

      Object.entries(segmentsByRoute).forEach(([route, segments]) => {
        console.log(`\nRoute ${route}:`);
        segments.forEach(segment => {
          console.log(`  ID: ${segment.ID}`);
          console.log(`  Date: ${segment.date}`);
          console.log(`  Availability: Y:${segment.classes.Y}, J:${segment.classes.J}, F:${segment.classes.F}`);
        });
      });

      // Continue with existing logic
      const segmentPromises = selectedSegments.map(segment => 
        fetch(`https://backend-284998006367.us-central1.run.app/api/route_details/${segment.ID}`, {
          headers: {
            'accept': 'application/json',
            'Partner-Authorization': apiKey
          }
        })
      );

      // First fetch availability data
      const routeString = currentRoute.join('-');
      const availabilityResponse = await fetch(
        `https://backend-284998006367.us-central1.run.app/api/availability/${routeString}`,
        {
          method: 'GET',
          headers: {
            'accept': 'application/json',
            'Partner-Authorization': apiKey
          }
        }
      );

      if (availabilityResponse.ok) {
        const availabilityResult = await availabilityResponse.json();
        
        // Process availability data into a more usable format
        const processedAvailability = {};
        availabilityResult.forEach(item => {
          const dateKey = item.date;
          if (!processedAvailability[dateKey]) {
            processedAvailability[dateKey] = [];
          }
          
          processedAvailability[dateKey].push({
            route: `${item.originAirport}-${item.destinationAirport}`,
            classes: {
              Y: item.YDirect,
              J: item.JDirect,
              F: item.FDirect
            },
            ID: item.ID,
            distance: item.distance
          });
        });
        
        setAvailabilityData(processedAvailability);
      }

      // Continue with existing segment search logic
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
            // Find route from availability data instead
            const availableRoutes = availabilityData[date] || [];
            const route = availableRoutes.find(r => 
              r.route === `${from}-${to}`
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
        if (newProcessedSegments.length >= 1) {
          // Log all flights found by segment
          console.log('\n=== All Flights Found ===');
          newProcessedSegments.forEach((segment, index) => {
            if (segment.flights && segment.flights.length > 0) {
              console.log(`\nSegment ${index} (${segment.route}):`);
              segment.flights
                .sort((a, b) => dayjs(a.DepartsAt).valueOf() - dayjs(b.DepartsAt).valueOf())
                .forEach(flight => {
                  console.log(`  ${flight.flightNumber} (${dayjs(flight.DepartsAt).format('MM-DD HH:mm')} - ${dayjs(flight.ArrivesAt).format('MM-DD HH:mm')}) ${flight.aircraft}`);
                });
            } else {
              console.log(`\nSegment ${index} (${segment.route}): No flights found`);
            }
          });

          console.log('\n=== Flight Combinations ===');
          
          // Find the first and last segments with flights
          const firstSegmentWithFlights = newProcessedSegments.findIndex(
            segment => segment.flights && segment.flights.length > 0
          );
          
          const lastSegmentWithFlights = [...newProcessedSegments].reverse().findIndex(
            segment => segment.flights && segment.flights.length > 0
          );
          const lastSegmentIndex = newProcessedSegments.length - 1 - lastSegmentWithFlights;

          console.log(`First segment with flights: ${firstSegmentWithFlights}`);
          console.log(`Last segment with flights: ${lastSegmentIndex}`);

          // Find all valid combinations recursively
          const findValidCombinations = (currentPath = [], segmentIndex = firstSegmentWithFlights) => {
            // If we've reached beyond the last valid segment, this is a valid combination
            if (segmentIndex > lastSegmentIndex) {
              return [currentPath];
            }

            const validCombos = [];
            const currentSegment = newProcessedSegments[segmentIndex];

            // If no flights in current segment, try next segment
            if (!currentSegment?.flights || currentSegment.flights.length === 0) {
              return findValidCombinations(currentPath, segmentIndex + 1);
            }

            // For single segment journeys, return all flights as valid combinations
            if (firstSegmentWithFlights === lastSegmentIndex) {
              return currentSegment.flights.map(flight => [flight]);
            }

            // For the last flight in the path, accept any flight
            if (currentPath.length === 0) {
              currentSegment.flights.forEach(flight => {
                // Start with the latest segment and work backwards
                const combos = findValidCombinationsBackward([flight], segmentIndex - 1);
                validCombos.push(...combos);
              });
            } 
            // For previous segments, check connection times
            else {
              const nextFlight = currentPath[0];
              const departure = dayjs(nextFlight.DepartsAt);

              currentSegment.flights.forEach(flight => {
                const arrival = dayjs(flight.ArrivesAt);
                const connectionTime = departure.diff(arrival, 'minutes');

                // Check if departure is within 24 hours of arrival
                if (connectionTime >= 60 && connectionTime <= 24 * 60) {
                  const combos = findValidCombinationsBackward([flight, ...currentPath], segmentIndex - 1);
                  validCombos.push(...combos);
                }
              });
            }

            return validCombos;
          };

          const findValidCombinationsBackward = (currentPath = [], segmentIndex) => {
            // If we've reached before the first segment, this is a valid combination
            if (segmentIndex < firstSegmentWithFlights) {
              return [currentPath];
            }

            const validCombos = [];
            const currentSegment = newProcessedSegments[segmentIndex];

            // If no flights in current segment, try previous segment
            if (!currentSegment || currentSegment.flights.length === 0) {
              return findValidCombinationsBackward(currentPath, segmentIndex - 1);
            }

            // For the first flight in the path, accept any flight
            if (currentPath.length === 0) {
              currentSegment.flights.forEach(flight => {
                const combos = findValidCombinationsBackward([flight], segmentIndex - 1);
                validCombos.push(...combos);
              });
            } 
            // For subsequent segments, check connection times
            else {
              const previousFlight = currentPath[0];
              const previousDeparture = dayjs(previousFlight.DepartsAt);

              currentSegment.flights.forEach(flight => {
                const arrival = dayjs(flight.ArrivesAt);
                const connectionTime = previousDeparture.diff(arrival, 'minutes');

                // Check if next departure is within 24 hours of arrival
                if (connectionTime >= 60 && connectionTime <= 24 * 60) {
                  const combos = findValidCombinationsBackward([flight, ...currentPath], segmentIndex - 1);
                  validCombos.push(...combos);
                }
              });
            }

            return validCombos;
          };

          const trySegmentRanges = () => {
            let allCombinations = [];
            const totalSegments = lastSegmentIndex - firstSegmentWithFlights + 1;
            
            // For single segment journeys
            if (totalSegments === 1) {
              const segment = newProcessedSegments[firstSegmentWithFlights];
              if (segment?.flights?.length > 0) {
                allCombinations = segment.flights.map(flight => [flight]);
                console.log(`Found ${allCombinations.length} combinations for single segment journey`);
                return allCombinations;
              }
            }
            
            // Try from longest to shortest segment combinations
            for (let segmentCount = totalSegments; segmentCount >= 2; segmentCount--) {
              console.log(`\nTrying ${segmentCount}-segment combinations...`);
              
              // Try all possible ranges of length segmentCount
              for (let startSegment = firstSegmentWithFlights; startSegment <= lastSegmentIndex - segmentCount + 1; startSegment++) {
                const endSegment = startSegment + segmentCount - 1;
                console.log(`Checking segments ${startSegment}-${endSegment}...`);
                
                // Use backward search if starting from first segment, forward search otherwise
                const combinations = startSegment === 0 
                  ? findValidCombinationsBackward([], endSegment)
                  : findValidCombinations([], startSegment, endSegment);
                  
                if (combinations.length > 0) {
                  console.log(`Found ${combinations.length} combinations for segments ${startSegment}-${endSegment}`);
                  allCombinations.push(...combinations);
                }
              }
              
              // If we found any combinations, stop looking for shorter ones
              if (allCombinations.length > 0) {
                console.log(`\nFound valid combinations with ${segmentCount} segments`);
                break;
              }
            }
            
            return allCombinations;
          };

          // Get all valid combinations using the new function
          const allCombinations = trySegmentRanges();

          // Log the combinations
          console.log('\n=== Valid Combinations ===');
          if (allCombinations.length === 0) {
            console.log('No valid combinations found for any segment range');
          } else {
            console.log(`Found ${allCombinations.length} valid combinations`);
            allCombinations.forEach(combo => {
              const flightInfo = combo.map((flight, idx) => {
                if (idx === 0) return `${flight.flightNumber} (${dayjs(flight.DepartsAt).format('MM-DD HH:mm')})`;
                
                const prevFlight = combo[idx - 1];
                const connectionTime = dayjs(flight.DepartsAt).diff(dayjs(prevFlight.ArrivesAt), 'minutes');
                const hours = Math.floor(connectionTime / 60);
                const minutes = connectionTime % 60;
                return `${flight.flightNumber} (${dayjs(flight.DepartsAt).format('MM-DD HH:mm')}) [${hours}:${minutes.toString().padStart(2, '0')}]`;
              });
              
              console.log(flightInfo.join(' → '));
            });
          }

          // Create a map of valid flights by segment
          const validFlightsBySegment = new Map();
          allCombinations.forEach(combo => {
            combo.forEach(flight => {
              const segmentKey = flight.segmentIndex;
              if (!validFlightsBySegment.has(segmentKey)) {
                validFlightsBySegment.set(segmentKey, new Set());
              }
              validFlightsBySegment.get(segmentKey).add(
                `${flight.flightNumber}_${dayjs(flight.DepartsAt).format('YYYY-MM-DD HH:mm')}`
              );
            });
          });

          // Filter and process flights
          const filteredFlights = [];
          for (let i = firstSegmentWithFlights; i <= lastSegmentIndex; i++) {
            const segment = newProcessedSegments[i];
            if (!segment || !segment.flights) continue;

            const validFlightsForSegment = validFlightsBySegment.get(i) || new Set();
            
            // Add valid flights from this segment
            segment.flights.forEach(flight => {
              const flightKey = `${flight.flightNumber}_${dayjs(flight.DepartsAt).format('YYYY-MM-DD HH:mm')}`;
              if (validFlightsForSegment.has(flightKey)) {
                filteredFlights.push({
                  ...flight,
                  isSelected: false,
                  segmentIndex: i
                });
              }
            });
          }

          setSegmentDetails(filteredFlights);
          setValidCombinations(allCombinations);

          // Log flights by segment
          console.log('\n=== Flights By Segment ===');
          for (let i = firstSegmentWithFlights; i <= lastSegmentIndex; i++) {
            const segmentFlights = filteredFlights.filter(f => f.segmentIndex === i);
            if (segmentFlights.length > 0) {
              console.log(`\nSegment ${i} (${segmentFlights[0].from}-${segmentFlights[0].to}):`);
              segmentFlights
                .sort((a, b) => dayjs(a.DepartsAt).valueOf() - dayjs(b.DepartsAt).valueOf())
                .forEach(flight => {
                  console.log(`  ${flight.flightNumber} (${dayjs(flight.DepartsAt).format('MM-DD HH:mm')})`);
                });
            }
          }
          
          console.log('\n======================');
        } else {
          setSegmentDetails(newProcessedSegments.flatMap((segment, index) => 
            segment.flights.map(flight => ({
              ...flight,
              isSelected: false,
              segmentIndex: index
            }))
          ));
          setValidCombinations([]);
        }
      } catch (error) {
        console.error('Error fetching segment details:', error);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoadingSegments(false);
      setIsLoadingAvailability(false);
    }
  };

  const handleCalendarSearch = async (currentRoute) => {
    if (!currentRoute || !apiKey) return;
    
    setIsLoadingAvailability(true);
    setSelectedFlights({});
    
    try {
      // Fetch availability data
      const routeString = currentRoute.join('-');
      const availabilityResponse = await fetch(
        `https://backend-284998006367.us-central1.run.app/api/availability/${routeString}`,
        {
          method: 'GET',
          headers: {
            'accept': 'application/json',
            'Partner-Authorization': apiKey
          }
        }
      );

      if (availabilityResponse.ok) {
        const availabilityResult = await availabilityResponse.json();
        
        // Process availability data into a more usable format
        const processedAvailability = {};
        availabilityResult.forEach(item => {
          const dateKey = item.date;
          if (!processedAvailability[dateKey]) {
            processedAvailability[dateKey] = [];
          }
          
          processedAvailability[dateKey].push({
            route: `${item.originAirport}-${item.destinationAirport}`,
            classes: {
              Y: item.YDirect,
              J: item.JDirect,
              F: item.FDirect
            },
            ID: item.ID,
            distance: item.distance,
            date: item.date
          });
        });
        
        setAvailabilityData(processedAvailability);
      }
    } catch (error) {
      console.error('Error fetching availability data:', error);
    } finally {
      setIsLoadingAvailability(false);
    }
  };

  const resetDetails = () => {
    setSegmentDetails([]);
    setIsLoadingSegments(false);
    setSelectedFlights({});
    setValidCombinations([]);
    setProcessedSegments([]);
    setOriginalFlights(null);
    setProcessedFlights(null);
    setInitialFlights(null);
    setAvailabilityData({});
    setIsLoadingAvailability(false);
  };

  const handleFlightSelect = (flight, segmentIndex) => {
    const flightKey = `${flight.flightNumber}_${dayjs(flight.DepartsAt).format('YYYY-MM-DD HH:mm')}`;
    console.log('\nAttempting to select/deselect:', flightKey, 'in segment:', segmentIndex);
    
    setSelectedFlights(prevSelected => {
      const newSelected = { ...prevSelected };
      
      // Check if this exact flight is already selected
      const isCurrentlySelected = newSelected[segmentIndex]?.some?.(f => {
        const matches = f.flightNumber === flight.flightNumber && 
                       dayjs(f.DepartsAt).isSame(dayjs(flight.DepartsAt));
        if (matches) {
          console.log(`Found existing selection: ${f.flightNumber} (${dayjs(f.DepartsAt).format('MM-DD HH:mm')}) in segment ${segmentIndex}`);
        }
        return matches;
      });

      if (isCurrentlySelected) {
        // Remove only this specific flight from the selection
        console.log(`\nDESELECTING: ${flight.flightNumber} (${dayjs(flight.DepartsAt).format('MM-DD HH:mm')}) from segment ${segmentIndex}`);
        newSelected[segmentIndex] = newSelected[segmentIndex].filter(f => {
          const keep = !(f.flightNumber === flight.flightNumber && 
                        dayjs(f.DepartsAt).isSame(dayjs(flight.DepartsAt)));
          if (!keep) {
            console.log(`Removed flight: ${f.flightNumber} (${dayjs(f.DepartsAt).format('MM-DD HH:mm')})`);
          }
          return keep;
        });
        if (newSelected[segmentIndex].length === 0) {
          console.log(`Removing empty segment ${segmentIndex}`);
          delete newSelected[segmentIndex];
        }
      } else {
        // Add this flight to the selections
        if (!newSelected[segmentIndex]) {
          newSelected[segmentIndex] = [];
        }
        newSelected[segmentIndex].push(flight);
        console.log(`\nSELECTING: ${flight.flightNumber} (${dayjs(flight.DepartsAt).format('MM-DD HH:mm')}) in segment ${segmentIndex}`);
      }

      // Log all current selections
      console.log('\nALL CURRENT SELECTIONS:');
      Object.entries(newSelected).forEach(([idx, flights]) => {
        if (Array.isArray(flights)) {
          flights.forEach(f => {
            console.log(`Segment ${idx}: ${f.flightNumber} (${dayjs(f.DepartsAt).format('MM-DD HH:mm')})`);
          });
        }
      });

      // Find valid combinations that include ANY of the selected flights per segment
      const validCombos = validCombinations.filter(combo => {
        return Object.entries(newSelected).every(([selectedSegmentIndex, selectedFlights]) => {
          const comboFlight = combo[selectedSegmentIndex];
          return selectedFlights.some(selectedFlight => 
            comboFlight && 
            comboFlight.flightNumber === selectedFlight.flightNumber && 
            dayjs(comboFlight.DepartsAt).isSame(dayjs(selectedFlight.DepartsAt))
          );
        });
      });

      console.log(`\nFound ${validCombos.length} valid combinations with selected flights`);

      // Filter and process flights
      const filteredFlights = validCombos.flatMap(combo => 
        combo.map((f, idx) => ({
          ...f,
          isSelected: newSelected[idx]?.some(sf => 
            sf.flightNumber === f.flightNumber && 
            dayjs(sf.DepartsAt).isSame(dayjs(f.DepartsAt))
          ) || false,
          segmentIndex: idx
        }))
      );

      // Remove duplicates while preserving selections
      const seenFlights = new Map();
      const uniqueFlights = filteredFlights.filter(f => {
        const key = `${f.flightNumber}_${dayjs(f.DepartsAt).format('YYYY-MM-DD HH:mm')}_${f.segmentIndex}`;
        if (!seenFlights.has(key)) {
          seenFlights.set(key, f.isSelected);
          return true;
        }
        f.isSelected = f.isSelected || seenFlights.get(key);
        return false;
      });

      setSegmentDetails(uniqueFlights);
      return newSelected;
    });
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
    handleCalendarSearch,
    resetDetails,
    columns,
    selectedFlights,
    availabilityData,
    isLoadingAvailability,
  };
} 