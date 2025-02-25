import { useState } from 'react';
import dayjs from 'dayjs';
import routeDetails from '../../../data/route_details.json';
import airlines from '../../../data/airlines';
import { getSegmentColumns } from '../segmentColumns';

export default function useFlightDetails(getColumns) {
  const [selectedDates, setSelectedDates] = useState(null);
  const [apiKey, setApiKey] = useState('');
  const [segmentDetails, setSegmentDetails] = useState([]);
  const [isLoadingSegments, setIsLoadingSegments] = useState(false);
  const [selectedFlights, setSelectedFlights] = useState({});
  const [validCombinations, setValidCombinations] = useState([]);
  const [processedSegments, setProcessedSegments] = useState([]);

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
    const baseDate = selectedDates.format('YYYY-MM-DD');
    
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
    const baseDate = selectedDates.format('YYYY-MM-DD');
    
    try {
      // Process all segments
      for (let i = 0; i < currentRoute.length - 1; i++) {
        const from = currentRoute[i];
        const to = currentRoute[i + 1];
        const prevSegment = processedSegments[i - 1];
        
        let timeWindow = null;
        if (prevSegment) {
          if (prevSegment.flights.length === 0) {
            if (i === 1) {
              timeWindow = {
                start: dayjs(baseDate).startOf('day'),
                end: dayjs(baseDate).add(1, 'day').endOf('day')
              };
            } else {
              break;
            }
          } else {
            // Calculate time window from previous segment's flights
            const arrivals = prevSegment.flights.map(f => {
              // Always base times on the selected date for all segments
              const arrivalTime = dayjs(f.ArrivesAt);
              return dayjs(`${baseDate} ${arrivalTime.format('HH:mm')}`).add(arrivalTime.diff(dayjs(f.ArrivesAt).startOf('day'), 'day'), 'day');
            });
            
            arrivals.sort((a, b) => a.valueOf() - b.valueOf());
            
            timeWindow = {
              start: arrivals[0],
              end: arrivals[arrivals.length - 1].add(24, 'hours')
            };
          }
          
          console.log('\nTime Window for', `${from}-${to}:`);
          console.log('From:', timeWindow.start.format('YYYY-MM-DD HH:mm'));
          console.log('To:', timeWindow.end.format('YYYY-MM-DD HH:mm'));
        }

        // Get all required dates for this segment
        const dates = new Set();
        if (timeWindow) {
          let currentDate = timeWindow.start;
          while (currentDate.isBefore(timeWindow.end) || currentDate.isSame(timeWindow.end, 'day')) {
            dates.add(currentDate.format('YYYY-MM-DD'));
            currentDate = currentDate.add(1, 'day');
          }
        } else {
          dates.add(baseDate);
        }

        console.log(`\nFetching dates for ${from}-${to}:`, Array.from(dates));
        
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

          console.log(`Processing route ${from}-${to} for ${date}:`);
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
              throw new Error(`Failed to fetch flight details for ${from}-${to}`);
            }

            const data = await response.json();
            const processedFlights = processFlightData(data, timeWindow, i);
            allFlights.push(...processedFlights);
          } catch (error) {
            console.error(`Error processing segment ${from}-${to} for ${date}:`, error);
          }
        }

        // If no flights found for this segment and it's not the first one
        if (allFlights.length === 0 && i > 0) {
          console.log(`\nNo flights found for segment ${from}-${to}`);
          console.log('Skipping remaining segments');
          break;
        }

        const earliestArrival = allFlights.length > 0 ? dayjs(allFlights[0].ArrivesAt) : null;
        const latestArrival = allFlights.length > 0 ? dayjs(allFlights[allFlights.length - 1].ArrivesAt) : null;

        newProcessedSegments.push({
          route: `${from}-${to}`,
          flights: allFlights,
          earliestArrival,
          latestArrival
        });
      }

      // After processing all segments
      if (newProcessedSegments.length >= 2) {
        console.log('\n=== Flight Combinations ===');
        
        // Store valid combinations
        const validCombinations = new Set();
        
        // For each flight in first segment
        newProcessedSegments[0].flights.forEach(firstFlight => {
          const firstArrival = dayjs(firstFlight.ArrivesAt);
          
          // Find all valid connections in second segment
          const connections = newProcessedSegments[1].flights.filter(secondFlight => {
            const secondDeparture = dayjs(secondFlight.DepartsAt);
            return secondDeparture.isAfter(firstArrival) && 
                   secondDeparture.isBefore(firstArrival.add(24, 'hours'));
          });
          
          // Format and log each valid connection
          connections.forEach(secondFlight => {
            const connectionTime = dayjs(secondFlight.DepartsAt).diff(firstArrival, 'minutes');
            const hours = Math.floor(connectionTime / 60);
            const minutes = connectionTime % 60;
            const connectionTimeFormatted = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
            
            // Add both flights to valid combinations set
            const firstFlightKey = `${firstFlight.flightNumber}_${dayjs(firstFlight.DepartsAt).format('YYYY-MM-DD')}`;
            const secondFlightKey = `${secondFlight.flightNumber}_${dayjs(secondFlight.DepartsAt).format('YYYY-MM-DD')}`;
            validCombinations.add(firstFlightKey);
            validCombinations.add(secondFlightKey);
            
            console.log(
              `${firstFlight.flightNumber} (${dayjs(firstFlight.DepartsAt).format('MM-DD')}), ` +
              `${secondFlight.flightNumber} (${dayjs(secondFlight.DepartsAt).format('MM-DD')}) ` +
              `(${connectionTimeFormatted})`
            );
          });
        });
        
        console.log('======================');

        // Filter out flights that aren't part of any valid combination
        const filteredFlights = newProcessedSegments.flatMap((segment, segmentIndex) => 
          segment.flights.filter(flight => {
            const flightKey = `${flight.flightNumber}_${dayjs(flight.DepartsAt).format('YYYY-MM-DD')}`;
            return validCombinations.has(flightKey);
          }).map(flight => ({
            ...flight,
            isSelected: false,
            segmentIndex
          }))
        );

        setSegmentDetails(filteredFlights);
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
    
    // Toggle selection using the unique flight key
    if (newSelected[segmentIndex] && 
        `${newSelected[segmentIndex].flightNumber}_${dayjs(newSelected[segmentIndex].DepartsAt).format('YYYY-MM-DD')}` === flightKey) {
      delete newSelected[segmentIndex];
      console.log('Deselected flight');
    } else {
      newSelected[segmentIndex] = flight;
      console.log('Selected flight');
    }
    
    setSelectedFlights(newSelected);
    
    // Update all flights with new selection state
    const updatedFlights = segmentDetails.map(f => ({
      ...f,
      isSelected: newSelected[f.segmentIndex]?.flightNumber === f.flightNumber && 
                  dayjs(newSelected[f.segmentIndex]?.DepartsAt).format('YYYY-MM-DD') === 
                  dayjs(f.DepartsAt).format('YYYY-MM-DD')
    }));
    
    setSegmentDetails(updatedFlights);
    
    // Filter next segment if needed
    if (Object.keys(newSelected).length > 0) {
      const lastSegmentIndex = Math.max(...Object.keys(newSelected).map(Number));
      const nextSegmentIndex = lastSegmentIndex + 1;
      
      if (nextSegmentIndex < processedSegments.length) {
        const lastFlight = newSelected[lastSegmentIndex];
        const lastArrival = dayjs(lastFlight.ArrivesAt);
        
        // Get valid next flights
        const validNextFlights = processedSegments[nextSegmentIndex].flights
          .filter(nextFlight => {
            const departure = dayjs(nextFlight.DepartsAt);
            return departure.isAfter(lastArrival) && 
                   departure.isBefore(lastArrival.add(24, 'hours'));
          })
          .map(f => ({
            ...f,
            isSelected: false,
            segmentIndex: nextSegmentIndex
          }));
        
        // Combine selected flights with valid next flights
        const filteredFlights = [
          ...Object.entries(newSelected).map(([idx, f]) => ({
            ...f,
            isSelected: true,
            segmentIndex: Number(idx)
          })),
          ...validNextFlights
        ];
        
        setSegmentDetails(filteredFlights);
      }
    } else {
      // Reset to show all flights
      const allFlights = processedSegments.flatMap((segment, idx) => 
        segment.flights.map(f => ({
          ...f,
          isSelected: false,
          segmentIndex: idx
        }))
      );
      setSegmentDetails(allFlights);
    }
  };

  // Create columns with the handler
  const columns = getColumns(handleFlightSelect);

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