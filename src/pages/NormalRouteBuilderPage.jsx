const handleSearchSubmit = (searchParams) => {
  const { path } = searchParams;
  console.log('🔍 NormalRouteBuilderPage - Received search params:', searchParams);
  console.log('🔍 NormalRouteBuilderPage - Path received:', path);
  
  // Extract route segments from path
  const routeSegments = path.split(/[/-]/);
  console.log('🔍 NormalRouteBuilderPage - Route segments extracted:', routeSegments);
  
  setCurrentRoute(routeSegments);
  handleSearch(searchParams);
}; 