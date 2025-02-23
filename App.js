import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import FlightSearch from './src/pages/FlightSearch';
import { Link } from 'react-router-dom';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/flight-search" element={<FlightSearch />} />
        {/* ... other routes ... */}
      </Routes>
      <Link to="/flight-search">Flight Search</Link>
    </Router>
  );
}

export default App; 