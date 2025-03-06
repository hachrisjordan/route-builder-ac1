import { useState } from 'react';

export default function useNormalFlightSearch() {
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

  const handleSearch = async (searchParams) => {
    const { departure, arrival, maxSegments, selectedAirlines } = searchParams;
    
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
      // This endpoint is for Normal Route Builder (not AC-specific)
      const response = await fetch('https://backend-284998006367.us-central1.run.app/api/find-normal-routes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          departureAirport: departure,
          arrivalAirport: arrival,
          excludedAirline: selectedAirlines.length ? selectedAirlines : [],
          maxSegments: maxSegments
        })
      });

      if (!response.ok) {
        throw new Error('Search failed');
      }

      // Create mock results if needed - normally would come from the API
      const mockResults = {
        routes: createMockRoutes(departure, arrival, maxSegments),
        status: "success"
      };
      
      // Use mock results for now - in production, use 'await response.json()'
      setSearchResults(mockResults);
      setPagination(prev => ({
        ...prev,
        total: mockResults.routes.length
      }));
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTableChange = (newPagination) => {
    setPagination(newPagination);
  };
  
  // Helper to create mock routes since we don't have a real API for this yet
  const createMockRoutes = (departure, arrival, maxSegments) => {
    const airlines = ["UA", "LH", "SQ", "BA", "DL", "AA", "EK", "QR"];
    const routes = [];
    
    for (let i = 0; i < 15; i++) {
      const segments = Math.min(Math.floor(Math.random() * maxSegments) + 1, maxSegments);
      
      const route = {
        id: `normal-${i}`,
        departure: departure,
        arrival: arrival,
        segments: segments,
        airlines: [],
        duration: Math.floor(Math.random() * 1200) + 300, // 5-25 hours in minutes
        distance: Math.floor(Math.random() * 8000) + 2000,
        flightSegments: []
      };
      
      // Generate segments
      let currentAirport = departure;
      for (let j = 0; j < segments; j++) {
        const airline = airlines[Math.floor(Math.random() * airlines.length)];
        
        if (!route.airlines.includes(airline)) {
          route.airlines.push(airline);
        }
        
        const nextAirport = j === segments - 1 ? arrival : `Airport${j + 1}`;
        
        route.flightSegments.push({
          id: `segment-${i}-${j}`,
          airline: airline,
          flightNumber: `${airline}${Math.floor(Math.random() * 1000) + 100}`,
          departure: currentAirport,
          arrival: nextAirport,
          departureTime: "10:00",
          arrivalTime: "14:30",
          duration: Math.floor(Math.random() * 600) + 120 // 2-12 hours in minutes
        });
        
        currentAirport = nextAirport;
      }
    }
    
    return routes;
  };

  return {
    searchResults,
    isLoading,
    handleSearch,
    pagination,
    handleTableChange,
    errors,
  };
}