import { useState } from 'react';
import { getSourceCodenames } from '../data/sources';
import { airportGroups } from '../data/airportGroups';

export default function useNormalFlightSearch() {
  const [flightData, setFlightData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [selectedDateRange, setSelectedDateRange] = useState(null);
  const [selectedFlights, setSelectedFlights] = useState(null);
  const [pricingData, setPricingData] = useState(null);
  const [currentRoute, setCurrentRoute] = useState([]);

  const expandAirportGroup = (code) => {
    if (!code) return [];
    return airportGroups[code] ? airportGroups[code].split('/') : [code];
  };

  const generateRoutePermutations = (path) => {
    console.log('Generating route permutations for path:', path);
    
    // Split the path into segments (e.g., "BOS-NYC-MIA" -> ["BOS", "NYC", "MIA"])
    const segments = path.split('-');
    console.log('Path segments for permutations:', segments);
    
    // Generate permutations for consecutive pairs
    const routes = [];
    for (let i = 0; i < segments.length - 1; i++) {
      const originGroup = segments[i];
      const destGroup = segments[i + 1];
      
      console.log(`Processing segment pair [${i}]: ${originGroup} → ${destGroup}`);
      
      // Expand airport groups (e.g., NYC -> [JFK, LGA, EWR])
      // For groups with explicit slashes like "HND/NRT", split them directly
      const origins = originGroup.includes('/') ? originGroup.split('/') : expandAirportGroup(originGroup);
      const destinations = destGroup.includes('/') ? destGroup.split('/') : expandAirportGroup(destGroup);
      
      console.log(`Expanded origins (${origins.length}):`, origins);
      console.log(`Expanded destinations (${destinations.length}):`, destinations);
      
      // If we have too many combinations, limit them
      const MAX_COMBINATIONS = 100;
      const totalCombinations = origins.length * destinations.length;
      
      if (totalCombinations > MAX_COMBINATIONS) {
        console.warn(`WARNING: Large number of combinations (${totalCombinations}), limiting output`);
        
        // Limit origins and destinations to reduce combinations
        const originsLimit = Math.min(origins.length, Math.ceil(Math.sqrt(MAX_COMBINATIONS)));
        const destinationsLimit = Math.min(destinations.length, Math.ceil(MAX_COMBINATIONS / originsLimit));
        
        console.log(`Limiting to ${originsLimit} origins and ${destinationsLimit} destinations`);
        
        // Take a subset of each array
        const limitedOrigins = origins.slice(0, originsLimit);
        const limitedDestinations = destinations.slice(0, destinationsLimit);
        
        // Update the arrays
        const originsInfo = `${limitedOrigins.length}/${origins.length}`;
        const destsInfo = `${limitedDestinations.length}/${destinations.length}`;
        console.log(`Using ${originsInfo} origins and ${destsInfo} destinations`);
        
        // Generate all combinations of origins and destinations
        const routeGroups = {};
        
        for (const origin of limitedOrigins) {
          if (!routeGroups[origin]) {
            routeGroups[origin] = [];
          }
          
          for (const destination of limitedDestinations) {
            routeGroups[origin].push(`${origin}-${destination}`);
          }
        }
        
        // Sort each group of routes alphabetically by destination
        Object.keys(routeGroups).sort().forEach(origin => {
          routeGroups[origin].sort();
          routes.push(...routeGroups[origin]);
        });
      } else {
        // Generate all combinations of origins and destinations
        const routeGroups = {};
        
        for (const origin of origins) {
          if (!routeGroups[origin]) {
            routeGroups[origin] = [];
          }
          
          for (const destination of destinations) {
            routeGroups[origin].push(`${origin}-${destination}`);
          }
        }
        
        // Sort each group of routes alphabetically by destination
        Object.keys(routeGroups).sort().forEach(origin => {
          routeGroups[origin].sort();
          routes.push(...routeGroups[origin]);
        });
      }
    }
    
    console.log(`Generated ${routes.length} route permutations`);
    return routes;
  };

  const processFlightData = (data) => {
    // Group flights by date and route
    const flightsByDate = {};
    const foundRoutes = new Set();
    
    console.log('Raw API response:', data);
    console.log('Current route with groups:', currentRoute);
    
    // Log stats on routes in the API response
    const apiRoutes = new Set();
    data.forEach(flight => {
      const route = `${flight.originAirport}-${flight.destinationAirport}`;
      apiRoutes.add(route);
    });
    console.log('Routes found in API response:', Array.from(apiRoutes));
    
    data.forEach(flight => {
      const date = flight.date;
      const route = `${flight.originAirport}-${flight.destinationAirport}`;
      
      // Check if this route is a consecutive pair in the current route segments
      const isConsecutivePair = currentRoute.some((airport, index) => {
        if (index >= currentRoute.length - 1) return false;
        
        const fromAirport = airport;
        const toAirport = currentRoute[index + 1];
        
        // Handle explicit slashes in airport codes
        const fromAirports = fromAirport.includes('/') 
          ? fromAirport.split('/')
          : (airportGroups[fromAirport]?.split('/') || [fromAirport]);
          
        const toAirports = toAirport.includes('/') 
          ? toAirport.split('/') 
          : (airportGroups[toAirport]?.split('/') || [toAirport]);
        
        // Check if the route matches any combination of expanded airports
        const isPair = fromAirports.some(from => 
          toAirports.some(to => 
            `${from}-${to}` === route
          )
        );
        
        return isPair;
      });

      // Only process consecutive pairs
      if (isConsecutivePair) {
        foundRoutes.add(route);
        
        if (!flightsByDate[date]) {
          flightsByDate[date] = {};
        }
        
        flightsByDate[date][route] = {
          classes: {
            Y: { available: flight.YAvailable, direct: flight.YDirect, airlines: flight.YAirlines },
            W: { available: flight.WAvailable, direct: flight.WDirect, airlines: flight.WAirlines },
            J: { available: flight.JAvailable, direct: flight.JDirect, airlines: flight.JAirlines },
            F: { available: flight.FAvailable, direct: flight.FDirect, airlines: flight.FAirlines }
          }
        };
      }
    });

    console.log('Routes matched and processed:', Array.from(foundRoutes));
    console.log('Missing routes (in permutations but not in API data):', 
      generateRoutePermutations(currentRoute.join('-'))
        .filter(route => !foundRoutes.has(route))
    );
    
    console.log('Processed flight data:', flightsByDate);
    return flightsByDate;
  };

  const handleSearch = async (searchParams, setExternalFlightData) => {
    const { path, sourcesExcluded, apiKey, dateRange } = searchParams;
    
    console.log('Search params:', { path, sourcesExcluded, dateRange });
    console.log('API Key present:', !!apiKey);
    
    // Reset errors
    setErrors({});

    // Clear previous flight data immediately
    setFlightData(null);
    if (setExternalFlightData) {
      setExternalFlightData(null);
    }

    // Validate mandatory fields
    if (!path) {
      setErrors({ path: 'Path is required' });
      console.log('Error: Path is required');
      return;
    }

    // Fix for case where frontend substitutes the value of an airport group
    // Check if the path looks like an expanded airport group but doesn't have the expected format
    let correctedPath = path;
    if (path.includes('/') && !path.includes('-')) {
      // This might be just the value of an airport group - try to find it
      for (const [code, airports] of Object.entries(airportGroups)) {
        if (path === airports) {
          console.log(`Path appears to be the raw value of airport group ${code}`);
          
          // Get the original search query which should be in format like "EST-WST"
          // We need to reverse engineer this, assume the code is the 2nd part
          // and try to find a logical first part
          for (const [firstCode, firstAirports] of Object.entries(airportGroups)) {
            const testPath = `${firstCode}-${code}`;
            console.log(`Testing potential original path: ${testPath}`);
            
            // Set the corrected path
            correctedPath = testPath;
            break;
          }
          
          break;
        }
      }
    }
    
    if (correctedPath !== path) {
      console.log(`Corrected path from "${path}" to "${correctedPath}"`);
      // Use the corrected path going forward
      path = correctedPath;
    }

    // Split path into segments - only split by hyphens, not slashes
    const segments = path.split('-');
    console.log('Original segments after splitting:', segments);
    
    if (segments.length < 2) {
      // Check if this could be an airport group directly
      let foundDirectMatch = false;
      for (const code of Object.keys(airportGroups)) {
        if (segments[0] === code) {
          foundDirectMatch = true;
          console.log(`Found direct match for airport group: ${code}`);
          // Try to find a reasonable second segment
          for (const secondCode of Object.keys(airportGroups)) {
            if (secondCode !== code) {
              // Create a new path with two airport group codes
              const newPath = `${code}-${secondCode}`;
              console.log(`Created new path from airport group: ${newPath}`);
              
              // Recursively call handleSearch with the new path
              return handleSearch({
                ...searchParams,
                path: newPath
              }, setExternalFlightData);
            }
          }
          break;
        }
      }
      
      // If it's not a direct match for an airport group, report an error
      if (!foundDirectMatch) {
        setErrors({ path: 'Invalid path format' });
        console.log('Error: Invalid path format, need at least 2 segments');
        return;
      }
    }

    // Update current route segments early - we need this for processing later
    setCurrentRoute(segments);
    console.log('Set current route segments:', segments);

    // Check if path contains airport group codes and expand them
    let expandedPath = path;
    let hasAirportGroups = false;
    
    // Check if any segment is an airport group code
    segments.forEach(segment => {
      console.log(`Checking segment "${segment}": ${airportGroups[segment] ? 'Is airport group' : 'Not airport group'}`);
      if (airportGroups[segment]) {
        hasAirportGroups = true;
      }
    });
    
    // If there are airport group codes, create the expanded path
    if (hasAirportGroups) {
      const expandedSegments = segments.map(segment => {
        // If it's an airport group code, use its value; otherwise, keep as is
        const expanded = airportGroups[segment] || segment;
        console.log(`Expanded "${segment}" to:`, expanded);
        return expanded;
      });
      
      // Join with hyphens to maintain the separation between segments
      expandedPath = expandedSegments.join('-');
      console.log('Expanded path from airport groups:', expandedPath);
      console.log('Expanded path length:', expandedPath.length);
      
      // Check if the path might be too long for the API
      if (expandedPath.length > 500) {
        console.warn('WARNING: Expanded path is very long. This might cause API issues.');
        
        // Try creating a more manageable path by taking only the first few airports from each group
        const MAX_AIRPORTS_PER_GROUP = 3;
        const shortenedSegments = segments.map(segment => {
          if (airportGroups[segment]) {
            // Take only the first few airports from each group
            const airports = airportGroups[segment].split('/');
            const shortList = airports.slice(0, MAX_AIRPORTS_PER_GROUP).join('/');
            console.log(`Shortened "${segment}" from ${airports.length} to ${MAX_AIRPORTS_PER_GROUP} airports:`, shortList);
            return shortList;
          }
          return segment;
        });
        
        const shortenedPath = shortenedSegments.join('-');
        console.log('Alternative shortened path:', shortenedPath);
        console.log('Shortened path length:', shortenedPath.length);
        
        // Use the shortened path if the original is too long
        if (expandedPath.length > 1000) {
          console.warn('Using shortened path due to excessive length');
          expandedPath = shortenedPath;
        }
      }
    }

    // Get all available source codenames and exclude the ones selected by user
    const allSources = getSourceCodenames();
    const includedSources = allSources.filter(source => !sourcesExcluded.includes(source));
    console.log('Included sources:', includedSources);

    setIsLoading(true);

    // Add a small delay to ensure UI updates
    await new Promise(resolve => setTimeout(resolve, 200));

    try {
      // Prepare request body
      const requestBody = {
        routeId: expandedPath,
        startDate: dateRange[0],
        endDate: dateRange[1],
        sources: includedSources.join(',')
      };
      console.log('Request body:', requestBody);
      
      // Send request with the expanded path
      console.log('Sending API request to:', 'https://backend-284998006367.us-central1.run.app/api/availability-v2');
      const response = await fetch('https://backend-284998006367.us-central1.run.app/api/availability-v2', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Partner-Authorization': apiKey
        },
        body: JSON.stringify(requestBody)
      });

      console.log('Response status:', response.status);
      if (!response.ok) {
        console.error('API Response not OK:', response.status, response.statusText);
        throw new Error(`Search failed with status ${response.status}`);
      }

      const data = await response.json();
      console.log('API response data length:', data.length);
      
      const processedData = processFlightData(data);
      console.log('Processed data:', processedData);
      
      // Generate route permutations for display purposes only
      const routePermutations = generateRoutePermutations(expandedPath);
      console.log('Route permutations:', routePermutations);
      
      const flightDataObj = {
        routes: routePermutations,
        data: processedData
      };
      console.log('Final flight data object:', flightDataObj);

      setFlightData(flightDataObj);
      if (setExternalFlightData) {
        setExternalFlightData(flightDataObj);
      }
      setSelectedDateRange(dateRange);
    } catch (error) {
      console.error('Search failed:', error);
      setErrors({ general: `Search failed: ${error.message}` });
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
    pricingData
  };
}