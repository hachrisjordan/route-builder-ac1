import { useState, useEffect, useRef, useMemo } from 'react';
import dayjs from 'dayjs';
import routeDetails from '../../../data/route_details.json';
import airlines from '../../../data/airlines';

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
  const [startDate, setStartDate] = useState(null);
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
        // Remove the Z suffix when parsing times since they're actually local times
        const departureTime = dayjs(trip.DepartsAt.replace('Z', ''));
        const arrivalTime = dayjs(trip.ArrivesAt.replace('Z', ''));
        
        console.log(`\nChecking flight ${trip.FlightNumbers}:`);
        console.log(`  Carrier: ${trip.Carriers}`);
        console.log(`  Departs: ${departureTime.format('YYYY-MM-DD HH:mm')}`);
        console.log(`  Arrives: ${arrivalTime.format('YYYY-MM-DD HH:mm')}`);
        
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
        // Remove the Z suffix when parsing times since they're actually local times
        const departureTime = dayjs(trip.DepartsAt.replace('Z', ''));
        const arrivalTime = dayjs(trip.ArrivesAt.replace('Z', '')); 

        // Convert CL carrier and flight numbers to LH
        const carrier = trip.Carriers === 'CL' ? 'LH' : trip.Carriers;
        const flightNumber = trip.FlightNumbers.startsWith('CL') 
          ? `LH${trip.FlightNumbers.slice(2)}` 
          : trip.FlightNumbers;

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

  const handleDateSearch = async (currentRoute, stopoverInfo, preserveCalendarData = false, clearSelections = false) => {
    console.log('\n=== useFlightDetails handleDateSearch ===');
    console.log('Current Route:', currentRoute);
    console.log('Received Stopover Info:', JSON.stringify(stopoverInfo, null, 2));
    console.log('Preserve Calendar Data:', preserveCalendarData);
    console.log('Clear Selections:', clearSelections);
    
    if (!selectedDates || !currentRoute || !apiKey) {
      console.log('Missing required data:', {
        selectedDates: !!selectedDates,
        currentRoute: !!currentRoute,
        apiKey: !!apiKey
      });
      return;
    }
    
    // Always clear flight selections when requested
    if (clearSelections) {
      setSelectedFlights({});
      setSegmentDetails(prevDetails => 
        prevDetails.map(f => ({
          ...f,
          isSelected: false,
          hidden: false
        }))
      );
    }
    
    setIsLoadingSegments(true);
    
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

      // Continue with existing segment search logic
      const segmentPromises = selectedSegments.map(segment => 
        fetch(`https://backend-284998006367.us-central1.run.app/api/route_details/${segment.ID}`, {
          headers: {
            'accept': 'application/json',
            'Partner-Authorization': apiKey
          }
        })
      );

      // Only fetch availability data if we're not preserving it
      if (!preserveCalendarData) {
        const routeString = currentRoute.join('-');
        
        // Add startDate parameter if available
        let url = `https://backend-284998006367.us-central1.run.app/api/availability/${routeString}`;
        if (startDate) {
          const formattedDate = dayjs(startDate).format('YYYY-MM-DD');
          url += `?startDate=${formattedDate}`;
        }
        
        const availabilityResponse = await fetch(
          url,
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
      }

      // Continue with existing segment search logic
      const newProcessedSegments = [];
      const [startDate, endDate] = selectedDates;
      const baseDate = dayjs(startDate).format('YYYY-MM-DD');
      
      console.log('\n=== Processing Segments with Stopover ===');
      if (stopoverInfo) {
        console.log('Stopover Details:', {
          airport: stopoverInfo.airport,
          days: stopoverInfo.days
        });
      }

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
            // Handle subsequent segments with stopover consideration
            const prevSegment = newProcessedSegments[i - 1];
            
            if (!prevSegment || prevSegment.flights.length === 0) {
              // Use full date range if no previous flights
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
              
              console.log('\n=== Processing Subsequent Segment ===');
              console.log('Segment:', `${currentRoute[i-1]}-${currentRoute[i]}`);
              console.log('Stopover Info:', JSON.stringify(stopoverInfo, null, 2));
              console.log('Current Airport:', currentRoute[i]);
              console.log('Previous Airport:', currentRoute[i-1]);
              console.log('Is Stopover Airport:', stopoverInfo && currentRoute[i] === stopoverInfo.airport);
              
              // Adjust time window based on stopover
              if (stopoverInfo && currentRoute[i] === stopoverInfo.airport) {
                console.log(`\nApplying stopover of ${stopoverInfo.days} days at ${stopoverInfo.airport}`);
                timeWindow = {
                  start: arrivals[0].add(stopoverInfo.days, 'days'),
                  end: arrivals[arrivals.length - 1].add(stopoverInfo.days, 'days').add(24, 'hours'),
                  isStopover: true,
                  stopoverDays: stopoverInfo.days
                };
              } else {
                timeWindow = {
                  start: arrivals[0],
                  end: arrivals[arrivals.length - 1].add(24, 'hours'),
                  isStopover: false,
                  stopoverDays: 0
                };
              }
              
              console.log('\nTime Window:', {
                start: timeWindow.start.format('YYYY-MM-DD HH:mm'),
                end: timeWindow.end.format('YYYY-MM-DD HH:mm'),
                isStopover: timeWindow.isStopover,
                stopoverDays: timeWindow.stopoverDays
              });

              // Get dates for time window
              for (let d = dayjs(timeWindow.start); d.valueOf() <= timeWindow.end.valueOf(); d = d.add(1, 'day')) {
                dates.add(d.format('YYYY-MM-DD'));
              }
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

            // For first segment, try all flights
            if (currentPath.length === 0) {
              currentSegment.flights.forEach(flight => {
                const combos = findValidCombinations([flight], segmentIndex + 1);
                validCombos.push(...combos);
              });
            } else {
              // For subsequent segments, check connection times
              const prevFlight = currentPath[currentPath.length - 1];
              const prevArrival = dayjs(prevFlight.ArrivesAt);
              const isStopoverPoint = stopoverInfo && 
                                     currentRoute[segmentIndex] === stopoverInfo.airport;

              currentSegment.flights.forEach(flight => {
                const departure = dayjs(flight.DepartsAt);
                const connectionTime = departure.diff(prevArrival, 'minutes');

                if (isStopoverPoint) {
                  // For stopover points, connection must be within stopover day window
                  const minStopoverTime = stopoverInfo.days * 24 * 60; // Convert days to minutes
                  const maxStopoverTime = (stopoverInfo.days + 1) * 24 * 60; // Add one more day for flexibility
                  
                  if (connectionTime >= minStopoverTime && connectionTime <= maxStopoverTime) {
                    const combos = findValidCombinations([...currentPath, flight], segmentIndex + 1);
                    validCombos.push(...combos);
                  }
                } else {
                  // For normal connections, 30 minutes to 24 hours
                  if (connectionTime >= 30 && connectionTime <= 24 * 60) {
                    const combos = findValidCombinations([...currentPath, flight], segmentIndex + 1);
                    validCombos.push(...combos);
                  }
                }
              });
            }

            return validCombos;
          };

          // Get all valid combinations using the new function
          const allCombinations = findValidCombinations();

          // Store combinations in ref immediately after finding them
          combinationsRef.current = allCombinations;

          // Log the combinations
          console.log('\n=== Valid Combinations ===');
          if (allCombinations.length === 0) {
            console.log('No valid combinations found for any segment range');
          } else {
            console.log(`Found ${allCombinations.length} valid combinations`);
            allCombinations.forEach(combo => {
              const flightInfo = combo.map((flight, idx) => {
                if (idx === 0) {
                  return `${flight.flightNumber} (${dayjs(flight.DepartsAt).format('MM-DD HH:mm')})`;
                }
                
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
        console.error('Error processing segments:', error);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoadingSegments(false);
    }
  };

  const handleCalendarSearch = async (currentRoute) => {
    if (!currentRoute || !apiKey) return;
    
    setIsLoadingAvailability(true);
    
    try {
      // Fetch availability data
      const routeString = currentRoute.join('-');
      
      // Add startDate parameter if available
      let url = `https://backend-284998006367.us-central1.run.app/api/availability/${routeString}`;
      if (startDate) {
        const formattedDate = dayjs(startDate).format('YYYY-MM-DD');
        url += `?startDate=${formattedDate}`;
        console.log(`Using start date: ${formattedDate} for availability search`);
      }
      
      console.log(`Fetching availability data from: ${url}`);
      
      const availabilityResponse = await fetch(
        url,
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
        console.log(`Received ${availabilityResult.length} availability records`);
        
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
      } else {
        console.error('Failed to fetch availability data:', availabilityResponse.status);
      }
    } catch (error) {
      console.error('Error fetching availability data:', error);
    } finally {
      setIsLoadingAvailability(false);
    }
  };

  const resetDetails = () => {
    // Clear all data states
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
    setStartDate(null); // Clear the start date
    
    // Note: We don't clear selectedDates here because we do it explicitly in the modal close handler
    
    // Reset the combinations reference
    combinationsRef.current = [];
    
    // Clear any stopover information in the FlightAvailabilityCalendar
    if (window.clearStopoverInfo && typeof window.clearStopoverInfo === 'function') {
      window.clearStopoverInfo();
    }
    
    // Clear calendar display
    if (window.hideCalendar && typeof window.hideCalendar === 'function') {
      window.hideCalendar();
    }
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

      // Use combinations from the ref
      const currentCombos = combinationsRef.current;
      const firstSegmentWithFlights = Math.min(...segmentDetails
        .filter(f => !f.hidden)
        .map(f => f.segmentIndex));
      
      console.log('\nChecking combinations:', currentCombos.map(combo => 
        combo.map(f => `${f.flightNumber} (${dayjs(f.DepartsAt).format('MM-DD HH:mm')})`).join(' → ')
      ));

      // Find combinations that contain the selected flight(s)
      const validCombos = currentCombos.filter(combo => {
        // If no selections, all combinations are valid
        if (Object.keys(newSelected).length === 0) return true;

        // Check if this combination contains all selected flights
        const isValid = Object.entries(newSelected).every(([segIdx, flights]) => {
          const selectedFlight = flights[0];
          // Adjust index based on first segment with flights
          const comboIndex = parseInt(segIdx, 10) - firstSegmentWithFlights;
          const comboFlight = combo[comboIndex];
          
          const matches = comboFlight?.flightNumber === selectedFlight.flightNumber &&
                         dayjs(comboFlight.DepartsAt).format('MM-DD HH:mm') === 
                         dayjs(selectedFlight.DepartsAt).format('MM-DD HH:mm');
          
          console.log(`Checking combo flight in segment ${segIdx}:`, {
            selected: `${selectedFlight.flightNumber} (${dayjs(selectedFlight.DepartsAt).format('MM-DD HH:mm')})`,
            combo: comboFlight ? `${comboFlight.flightNumber} (${dayjs(comboFlight.DepartsAt).format('MM-DD HH:mm')})` : 'none',
            comboIndex,
            matches
          });
          
          return matches;
        });

        return isValid;
      });

      console.log('\nValid combinations:', validCombos.map(combo => 
        combo.map(f => `${f.flightNumber} (${dayjs(f.DepartsAt).format('MM-DD HH:mm')})`).join(' → ')
      ));

      // Create a set of all flights that appear in valid combinations
      const validFlights = new Set();
      validCombos.forEach(combo => {
        combo.forEach(f => {
          if (!f) return;
          const key = `${f.flightNumber}_${dayjs(f.DepartsAt).format('YYYY-MM-DD HH:mm')}`;
          validFlights.add(key);
        });
      });

      // Update visibility
      setSegmentDetails(prevDetails => 
        prevDetails.map(f => {
          const flightKey = `${f.flightNumber}_${dayjs(f.DepartsAt).format('YYYY-MM-DD HH:mm')}`;
          const isSelected = newSelected[f.segmentIndex]?.some(sf => 
            sf.flightNumber === f.flightNumber && 
            dayjs(sf.DepartsAt).format('MM-DD HH:mm') === dayjs(f.DepartsAt).format('MM-DD HH:mm')
          ) || false;

          return {
            ...f,
            isSelected,
            hidden: Object.keys(newSelected).length > 0 && !isSelected && !validFlights.has(flightKey)
          };
        })
      );

      return newSelected;
    });
  };

  const columns = useMemo(() => {
    if (!selectedDates) return getColumns(handleFlightSelect);
    const [startDate] = selectedDates;
    return getColumns(handleFlightSelect, dayjs(startDate).startOf('day'));
  }, [handleFlightSelect, selectedDates, getColumns]);

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
    startDate,
    setStartDate,
  };
} 