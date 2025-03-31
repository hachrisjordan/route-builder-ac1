import { getSourceByCodename } from '../data/sources';
import airlines from '../data/airlines_full';
import { airportGroups, airportGroupDescriptions } from '../data/airportGroups';

// Sample raw response data for fallback
export const sampleRawData = [
  {
    "originAirport": "LHR",
    "destinationAirport": "EWR",
    "date": "2025-03-28",
    "distance": 3459,
    "ID": "sample1",
    "source": "aeroplan",
    "YAvailable": true,
    "WAvailable": false,
    "JAvailable": true,
    "FAvailable": false,
    "YDirect": true,
    "WDirect": false,
    "JDirect": true,
    "FDirect": false,
    "YAirlines": "AC, LH, QK, UA",
    "WAirlines": "",
    "JAirlines": "UA",
    "FAirlines": "",
    "YDirectAirlines": "UA",
    "WDirectAirlines": "",
    "JDirectAirlines": "UA",
    "FDirectAirlines": "",
    "YMileageCost": "40000",
    "WMileageCost": "0",
    "JMileageCost": "80000",
    "FMileageCost": "0",
    "YTotalTaxes": 34639,
    "WTotalTaxes": 0,
    "JTotalTaxes": 55000,
    "FTotalTaxes": 0,
    "YDirectMileageCost": 40000,
    "WDirectMileageCost": 0,
    "JDirectMileageCost": 80000,
    "FDirectMileageCost": 0,
    "YDirectTotalTaxes": 35470,
    "WDirectTotalTaxes": 0,
    "JDirectTotalTaxes": 55000,
    "FDirectTotalTaxes": 0,
    "TaxesCurrency": "CAD"
  }
];

// Get enriched flight data with raw API information
export const getEnrichedFlightData = (routeCode, classCode, dateString, classData, flightData) => {
  // Handle missing or empty classData
  if (!classData) {
    return [];
  }
  
  // Extract flights from the class data
  // If there are no flights but the class is available, create synthetic flights from the sources
  let flights = [];
  if (classData.flights && classData.flights.length > 0) {
    flights = [...classData.flights];
  } else if (classData.available && classData.sources) {
    // Create synthetic flights from sources if no flights are provided but class is available
    const sources = classData.sources.split(',').filter(s => s.trim());
    
    flights = sources.map(source => ({
      source: source.trim(),
      direct: classData.direct || false,
      id: `synthetic-${source.trim()}-${Date.now()}`
    }));
  }
  
  // If still no flights, return empty array
  if (flights.length === 0) {
    return [];
  }

  // Check for raw data from the flightData prop
  const rawDataArray = flightData?.rawData || sampleRawData;
  
  // Ensure raw data is available for each flight
  return flights.map(flight => {
    // If rawData is already present, just return the flight
    if (flight.rawData) return flight;
    
    try {
      // Find matching raw flight data
      const [origin, destination] = routeCode.split('-');
      
      const raw = rawDataArray.find(rawFlight => {
        return (
          // Match by ID if available
          (rawFlight.ID === flight.id || !flight.id) &&
          // Match by date
          rawFlight.date === dateString &&
          // Match by route
          rawFlight.originAirport === origin && 
          rawFlight.destinationAirport === destination &&
          // Match by class availability
          rawFlight[`${classCode}Available`] === true &&
          // Match by source if available
          (flight.source ? rawFlight.source === flight.source : true)
        );
      });
      
      if (raw) {
        return {
          ...flight,
          rawData: raw
        };
      }
      
      // Create sample raw data if none found
      const sampleRaw = {
        ...sampleRawData[0],
        originAirport: origin,
        destinationAirport: destination,
        date: dateString,
        ID: flight.id || `sample-${Date.now()}`,
        source: flight.source || "sample",
        [`${classCode}Available`]: true,
        [`${classCode}Direct`]: flight.direct || classData.direct || false,
        [`${classCode}Airlines`]: "Sample Airlines",
        [`${classCode}DirectAirlines`]: flight.direct || classData.direct ? "Sample Airlines" : "",
        [`${classCode}MileageCost`]: "50000", 
        [`${classCode}DirectMileageCost`]: flight.direct || classData.direct ? "50000" : "0",
        [`${classCode}TotalTaxes`]: 50,
        [`${classCode}DirectTotalTaxes`]: flight.direct || classData.direct ? 50 : 0,
        TaxesCurrency: "USD"
      };
      
      return {
        ...flight,
        rawData: sampleRaw
      };
    } catch (error) {
      console.warn('Error finding raw flight data:', error);
      return flight;
    }
  });
};

// Helper function to check if a segment is valid for the current route
export const isValidSegmentForRoute = (segment, currentRoute) => {
  const [origin, destination] = typeof segment === 'string' 
    ? segment.split('-') 
    : segment.route.split('-');
  
  // Check if this segment follows the sequence in currentRoute
  for (let i = 0; i < currentRoute.length - 1; i++) {
    const fromGroup = currentRoute[i];
    const toGroup = currentRoute[i + 1];
    
    // Get airports for each group
    const fromAirports = airportGroups[fromGroup]?.split('/') || [fromGroup];
    const toAirports = airportGroups[toGroup]?.split('/') || [toGroup];
    
    // If this segment is part of the current route section
    if (fromAirports.includes(origin) && toAirports.includes(destination)) {
      return true; // This is a valid segment
    }
  }
  
  return false; // Segment doesn't match any part of the route sequence
};

// Helper function to get segment index in the route order
export const getSegmentIndex = (origin, dest, currentRoute) => {
  for (let i = 0; i < currentRoute.length - 1; i++) {
    const fromGroup = currentRoute[i];
    const toGroup = currentRoute[i + 1];
    
    // Check if the segment belongs to this route segment
    const fromAirports = airportGroups[fromGroup]?.split('/') || [fromGroup];
    const toAirports = airportGroups[toGroup]?.split('/') || [toGroup];
    
    // If this segment is part of this route section
    if (fromAirports.includes(origin) && toAirports.includes(dest)) {
      return i;
    }
  }
  return -1; // Segment not found in route
};

// Helper function to compare two segments for ordering
export const compareSegments = (a, b, currentRoute) => {
  // Get the origin and destination of each route
  const [aOrigin, aDest] = typeof a === 'string' ? a.split('-') : a.route.split('-');
  const [bOrigin, bDest] = typeof b === 'string' ? b.split('-') : b.route.split('-');
  
  // Get segment indices for both routes
  const aIndex = getSegmentIndex(aOrigin, aDest, currentRoute);
  const bIndex = getSegmentIndex(bOrigin, bDest, currentRoute);
  
  // Sort by segment index first
  if (aIndex !== bIndex) {
    return aIndex - bIndex;
  }
  
  // If both routes are in the same segment, sort by exact matches to currentRoute first
  if (aOrigin === currentRoute[aIndex] && aDest === currentRoute[aIndex + 1]) return -1;
  if (bOrigin === currentRoute[bIndex] && bDest === currentRoute[bIndex + 1]) return 1;
  
  // Next, prioritize routes where the origin matches the exact origin in currentRoute
  if (aOrigin === currentRoute[aIndex] && bOrigin !== currentRoute[bIndex]) return -1;
  if (bOrigin === currentRoute[bIndex] && aOrigin !== currentRoute[aIndex]) return 1;
  
  // Next, prioritize routes where the destination matches the exact destination in currentRoute
  if (aDest === currentRoute[aIndex + 1] && bDest !== currentRoute[bIndex + 1]) return -1;
  if (bDest === currentRoute[bIndex + 1] && aDest !== currentRoute[aIndex + 1]) return 1;
  
  // For routes in the same segment group with no exact matches, sort alphabetically
  const routeA = typeof a === 'string' ? a : a.route;
  const routeB = typeof b === 'string' ? b : b.route;
  return routeA.localeCompare(routeB);
};

// When sorting validFlights
export const sortSegments = (a, b, segmentOrder, currentRoute) => {
  // Use custom order if available
  if (segmentOrder.length > 0) {
    const aIndex = segmentOrder.indexOf(a.route);
    const bIndex = segmentOrder.indexOf(b.route);
    
    // If both routes are in our order, use that order
    if (aIndex !== -1 && bIndex !== -1) {
      return aIndex - bIndex;
    }
    
    // If only one route is in our order, prioritize it
    if (aIndex !== -1) return -1;
    if (bIndex !== -1) return 1;
  }
  
  // Use the common segment comparison function
  return compareSegments(a, b, currentRoute);
};

// Get the full airline name from source codename
export const getAirlineName = (codename) => {
  const source = getSourceByCodename(codename);
  return source ? `${source.airline} ${source.ffname}` : codename;
}; 