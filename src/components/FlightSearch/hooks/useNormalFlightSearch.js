import { useState, useEffect } from 'react';
import { getSourceCodenames } from '../data/sources';
import { airportGroups } from '../data/airportGroups';

// API key storage key
const API_KEY_STORAGE_KEY = 'normalRouteBuilderApiKey';

export default function useNormalFlightSearch() {
  const [flightData, setFlightData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [selectedDateRange, setSelectedDateRange] = useState(null);
  const [selectedFlights, setSelectedFlights] = useState(null);
  const [pricingData, setPricingData] = useState(null);
  const [currentRoute, setCurrentRoute] = useState([]);
  const [cachedApiKey, setCachedApiKey] = useState('');

  // Load cached API key on initial mount
  useEffect(() => {
    const storedApiKey = localStorage.getItem(API_KEY_STORAGE_KEY);
    if (storedApiKey) {
      setCachedApiKey(storedApiKey);
    }
  }, []);

  // Save API key to localStorage
  const saveApiKey = (apiKey) => {
    if (apiKey) {
      localStorage.setItem(API_KEY_STORAGE_KEY, apiKey);
      setCachedApiKey(apiKey);
    }
  };

  const expandAirportGroup = (code) => {
    if (!code) return [];
    return airportGroups[code] ? airportGroups[code].split('/') : [code];
  };

  const generateRoutePermutations = (path) => {
    // Split the path into segments
    const segments = path.split('-');
    const routes = [];
    
    // Generate permutations for consecutive pairs
    for (let i = 0; i < segments.length - 1; i++) {
      const originGroup = segments[i];
      const destGroup = segments[i + 1];
      
      // Get the airports for each group
      const origins = airportGroups[originGroup]?.split('/') || [originGroup];
      const destinations = airportGroups[destGroup]?.split('/') || [destGroup];
      
      // Generate all combinations
      origins.forEach(origin => {
        destinations.forEach(destination => {
          routes.push(`${origin}-${destination}`);
        });
      });
    }
    
    return routes;
  };

  const processFlightData = (data, routeSegments = currentRoute) => {
    // Group flights by date and route
    const flightsByDate = {};
    
    // Get all possible valid routes from our segments
    const validRoutes = new Set();
    const validPaths = [];
    
    // Generate all possible paths through the segments
    const generatePaths = (currentPath = [], segmentIndex = 0) => {
      if (segmentIndex >= routeSegments.length) {
        // We've reached the end of the segments, add this path
        if (currentPath.length >= 2) {
          validPaths.push([...currentPath]);
        }
        return;
      }
      
      // Get the current segment
      const segment = routeSegments[segmentIndex];
      
      // Expand the segment to get all airports
      let airports = [];
      
      // Handle all segment expansions uniformly
      if (segment.includes('/')) {
        // If the segment contains multiple options (like EST/WST)
        // Split it and handle each option separately
        const segmentParts = segment.split('/');
        // For each part, check if it's an airport group and expand if needed
        airports = segmentParts.flatMap(part => {
          if (airportGroups[part]) {
            return airportGroups[part].split('/');
          }
          return [part];
        });
      } else if (airportGroups[segment]) {
        // If it's a single airport group, expand it
        airports = airportGroups[segment].split('/');
      } else {
        // Otherwise, it's a single airport
        airports = [segment];
      }
      
      // Add each airport to the path and continue
      airports.forEach(airport => {
        currentPath.push(airport);
        generatePaths(currentPath, segmentIndex + 1);
        currentPath.pop(); // Backtrack
      });
    };
    
    // Start generating paths
    generatePaths();
    
    // For each valid path, generate all valid routes between consecutive airports
    validPaths.forEach(path => {
      for (let i = 0; i < path.length - 1; i++) {
        const from = path[i];
        const to = path[i + 1];
        validRoutes.add(`${from}-${to}`);
      }
    });
    
    // For multi-segment paths (3+ segments), also consider "jumping" segments
    // This handles cases like USA-DOH-SAS where flights can go directly from USA to SAS
    validPaths.forEach(path => {
      if (path.length >= 3) {
        for (let i = 0; i < path.length - 2; i++) {
          for (let j = i + 2; j < path.length; j++) {
            // Create a route from airport i to airport j (skipping intermediate airports)
            const from = path[i];
            const to = path[j];
            validRoutes.add(`${from}-${to}`);
          }
        }
      }
    });
    
    console.log('Current route segments:', routeSegments);
    console.log('Valid routes to match:', Array.from(validRoutes));
    
    // First, group flights by date, route, and aggregate availability
    const aggregatedData = {};
    
    // Process each flight from the API response
    data.forEach(flight => {
      const date = flight.date;
      const route = `${flight.originAirport}-${flight.destinationAirport}`;
      
      // Instead of special cases, we now properly handle all segment combinations
      // by recursively expanding airport group codes in the path generation function above
      
      // Check if this route is in our valid routes set
      const isInValidRoutes = validRoutes.has(route);
      
      // Helper function to check if an airport is in a segment group
      const isAirportInSegment = (airport, segment) => {
        // Direct match
        if (segment === airport) return true;
        
        // Check if it's in the airport group
        if (airportGroups[segment]) {
          const airports = airportGroups[segment].split('/');
          return airports.includes(airport);
        }
        
        return false;
      };
      
      // Check if this flight is part of a valid path
      let isPartOfValidPath = false;
      
      // Check each valid path
      for (const path of validPaths) {
        // Check if origin and destination are both in the path and in the correct order
        const originIndex = path.indexOf(flight.originAirport);
        const destIndex = path.indexOf(flight.destinationAirport);
        
        if (originIndex !== -1 && destIndex !== -1 && originIndex < destIndex) {
          isPartOfValidPath = true;
          break;
        }
      }
      
      // Check if airports are in consecutive segments of the route
      let isInConsecutiveSegments = false;
      for (let i = 0; i < routeSegments.length - 1; i++) {
        const fromSegment = routeSegments[i];
        const toSegment = routeSegments[i + 1];
        
        if (isAirportInSegment(flight.originAirport, fromSegment) && 
            isAirportInSegment(flight.destinationAirport, toSegment)) {
          isInConsecutiveSegments = true;
          break;
        }
      }
      
      // Also check for airports in non-consecutive segments
      let isInNonConsecutiveSegments = false;
      for (let i = 0; i < routeSegments.length; i++) {
        for (let j = i + 2; j < routeSegments.length; j++) {
          const fromSegment = routeSegments[i];
          const toSegment = routeSegments[j];
          
          if (isAirportInSegment(flight.originAirport, fromSegment) && 
              isAirportInSegment(flight.destinationAirport, toSegment)) {
            isInNonConsecutiveSegments = true;
            break;
          }
        }
        if (isInNonConsecutiveSegments) break;
      }
      
      if (isInValidRoutes || isPartOfValidPath || isInConsecutiveSegments || isInNonConsecutiveSegments) {
        if (!aggregatedData[date]) {
          aggregatedData[date] = {};
        }
        
        if (!aggregatedData[date][route]) {
          aggregatedData[date][route] = {
            YAvailable: false,
            YDirect: false,
            WAvailable: false,
            WDirect: false,
            JAvailable: false,
            JDirect: false,
            FAvailable: false,
            FDirect: false,
            YSources: new Set(),
            WSources: new Set(),
            JSources: new Set(),
            FSources: new Set(),
            YFlights: [],
            WFlights: [],
            JFlights: [],
            FFlights: []
          };
        }
        
        // Update aggregated data based on this flight
        const routeData = aggregatedData[date][route];
        
        // For each cabin class, update availability and direct flags
        // Y class
        if (flight.YAvailable) {
          routeData.YAvailable = true;
          
          // If any flight has direct availability, set direct to true
          if (flight.YDirect) {
            routeData.YDirect = true;
          }
          
          // Add source
          if (flight.source) {
            routeData.YSources.add(flight.source);
          }
          
          // Store full flight data for tooltip
          routeData.YFlights.push({
            source: flight.source,
            direct: flight.YDirect,
            id: flight.ID
          });
        }
        
        // W class
        if (flight.WAvailable) {
          routeData.WAvailable = true;
          
          if (flight.WDirect) {
            routeData.WDirect = true;
          }
          
          if (flight.source) {
            routeData.WSources.add(flight.source);
          }
          
          routeData.WFlights.push({
            source: flight.source,
            direct: flight.WDirect,
            id: flight.ID
          });
        }
        
        // J class
        if (flight.JAvailable) {
          routeData.JAvailable = true;
          
          if (flight.JDirect) {
            routeData.JDirect = true;
          }
          
          if (flight.source) {
            routeData.JSources.add(flight.source);
          }
          
          routeData.JFlights.push({
            source: flight.source,
            direct: flight.JDirect,
            id: flight.ID
          });
        }
        
        // F class
        if (flight.FAvailable) {
          routeData.FAvailable = true;
          
          if (flight.FDirect) {
            routeData.FDirect = true;
          }
          
          if (flight.source) {
            routeData.FSources.add(flight.source);
          }
          
          routeData.FFlights.push({
            source: flight.source,
            direct: flight.FDirect,
            id: flight.ID
          });
        }
      }
    });
    
    // Convert aggregated data to final format
    for (const [date, routes] of Object.entries(aggregatedData)) {
      if (!flightsByDate[date]) {
        flightsByDate[date] = {};
      }
      
      for (const [route, data] of Object.entries(routes)) {
        flightsByDate[date][route] = {
          classes: {
            Y: { 
              available: data.YAvailable, 
              direct: data.YDirect, 
              sources: Array.from(data.YSources).join(','),
              flights: data.YFlights
            },
            W: { 
              available: data.WAvailable, 
              direct: data.WDirect, 
              sources: Array.from(data.WSources).join(','),
              flights: data.WFlights
            },
            J: { 
              available: data.JAvailable, 
              direct: data.JDirect, 
              sources: Array.from(data.JSources).join(','),
              flights: data.JFlights
            },
            F: { 
              available: data.FAvailable, 
              direct: data.FDirect, 
              sources: Array.from(data.FSources).join(','),
              flights: data.FFlights
            }
          }
        };
      }
    }

    // Log the processed data for debugging
    console.log('Processed flight data:', flightsByDate);
    
    return flightsByDate;
  };

  const handleSearch = async (searchParams, setExternalFlightData) => {
    const { path, sourcesExcluded, apiKey, dateRange } = searchParams;
    
    // Cache the API key when a search is performed
    if (apiKey) {
      saveApiKey(apiKey);
    }
    
    console.log('🔍 SEARCH DEBUG - Original search params:', searchParams);
    console.log('🔍 SEARCH DEBUG - Path received:', path);
    console.log('🔍 SEARCH DEBUG - Path type:', typeof path);
    
    // Reset errors and clear previous data
    setErrors({});
    setFlightData(null);
    
    // Instead of just updating state (which is async), also keep a local copy for this function call
    let routeSegmentsForProcessing = [];
    setCurrentRoute([]);
    
    if (setExternalFlightData) {
      setExternalFlightData(null);
    }

    // Validate mandatory fields
    if (!path) {
      setErrors({ path: 'Path is required' });
      console.log('🔍 SEARCH DEBUG - Path is missing');
      return;
    }

    // First, check if the path is already expanded (contains / and -), like "EWR/JFK/LGA-HND/NRT"
    if (path.includes('/') && path.includes('-')) {
      console.log('Path is already expanded:', path);
      // Split into segments based on hyphens
      const segments = path.split('-');
      console.log('Expanded route segments:', segments);
      
      if (segments.length < 2) {
        setErrors({ path: 'Invalid path format. Need at least two segments.' });
        return;
      }
      
      // Store the segments for later use (both in state and local var)
      routeSegmentsForProcessing = segments;
      setCurrentRoute(segments);
      
      // For API request, we'll keep using the expanded format
      const originalPath = path;
      
      // Continue with the search...
      // Get all available source codenames and exclude the ones selected by user
      const allSources = getSourceCodenames();
      const includedSources = allSources.filter(source => !sourcesExcluded.includes(source));

      setIsLoading(true);

      try {
        // Prepare the request body
        const requestBody = {
          routeId: originalPath,
          startDate: dateRange[0],
          endDate: dateRange[1],
          sources: includedSources.join(',')
        };

        console.log('API Request Body:', requestBody);

        // Send request with the expanded path (e.g., "EWR/JFK/LGA-HND/NRT")
        const response = await fetch('https://backend-284998006367.us-central1.run.app/api/availability-v2', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Partner-Authorization': apiKey
          },
          body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
          throw new Error('Search failed');
        }

        const data = await response.json();
        console.log('API response:', data);
        
        // Process the flight data
        const processedData = processFlightData(data, routeSegmentsForProcessing);
        
        // For expanded paths, we don't need to generate permutations again
        const flightDataObj = {
          routes: generateRoutePermutations(originalPath),
          data: processedData,
          rawData: data
        };

        setFlightData(flightDataObj);
        if (setExternalFlightData) {
          setExternalFlightData(flightDataObj);
        }
        setSelectedDateRange(dateRange);
      } catch (error) {
        console.error('Search failed:', error);
        setErrors({ general: 'Search failed. Please try again.' });
      } finally {
        setIsLoading(false);
      }
      
      return;
    }

    // Check if the path is an expanded airport group value
    let originalPath = path;
    if (path.includes('/') && !path.includes('-')) {
      // This is likely an expanded airport group value
      console.log('Path appears to be an expanded airport group value:', path);
      
      // Try to find which airport group this value belongs to
      for (const [code, airports] of Object.entries(airportGroups)) {
        if (path === airports) {
          console.log('Found matching airport group:', code);
          
          // Detailed error message explaining the issue
          setErrors({ 
            path: `
              Error: Received only one expanded airport group "${code}" (${path}).
              The search path should be in format like "NYC-TYO" or "EWR/JFK/LGA-HND/NRT".
              Please check HybridPathInput component - it's sending expanded airports instead of the full path.
            `
          });
          console.error(`
            DETECTED FRONTEND BUG IN HybridPathInput COMPONENT:
            When searching for paths like "NYC-TYO", the frontend is only sending the 
            expanded value of the last part ("HND/NRT") instead of the full path.
            
            To fix: Update HybridPathInput to send the full path with airport group codes.
          `);
          return;
        }
      }
    }

    // Split path into segments (e.g., "EST-WST-EUR" -> ["EST", "WST", "EUR"])
    const segments = originalPath.split('-');
    console.log('Route segments:', segments);
    
    if (segments.length < 2) {
      setErrors({ path: 'Invalid path format' });
      return;
    }

    // Store the original segments for later use (both in state and local var)
    routeSegmentsForProcessing = segments;
    setCurrentRoute(segments);

    // Get all available source codenames and exclude the ones selected by user
    const allSources = getSourceCodenames();
    const includedSources = allSources.filter(source => !sourcesExcluded.includes(source));

    setIsLoading(true);

    try {
      // Prepare the request body
      const requestBody = {
        routeId: originalPath,
        startDate: dateRange[0],
        endDate: dateRange[1],
        sources: includedSources.join(',')
      };

      console.log('API Request Body:', requestBody);

      // Send request with the original path (e.g., "EST-WST-EUR")
      const response = await fetch('https://backend-284998006367.us-central1.run.app/api/availability-v2', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Partner-Authorization': apiKey
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error('Search failed');
      }

      const data = await response.json();
      console.log('API response:', data);
      
      // Process the flight data
      const processedData = processFlightData(data, routeSegmentsForProcessing);
      
      // Generate route permutations for display
      const routePermutations = generateRoutePermutations(originalPath);
      
      const flightDataObj = {
        routes: routePermutations,
        data: processedData,
        rawData: data
      };

      setFlightData(flightDataObj);
      if (setExternalFlightData) {
        setExternalFlightData(flightDataObj);
      }
      setSelectedDateRange(dateRange);
    } catch (error) {
      console.error('Search failed:', error);
      setErrors({ general: 'Search failed. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDateRangeSelect = (dateRange) => {
    setSelectedDateRange(dateRange);
  };

  const handleFlightSelect = (flights, pricing) => {
    setSelectedFlights(flights);
    setPricingData(pricing);
  };

  return {
    flightData,
    isLoading,
    handleSearch,
    errors,
    selectedDateRange,
    handleDateRangeSelect,
    selectedFlights,
    handleFlightSelect,
    pricingData,
    cachedApiKey,
    saveApiKey
  };
}