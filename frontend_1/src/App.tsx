// Import dependencies
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

// Import components
import Header from './components/Header';

// Import pages
import Home from './pages/Home';
import Login from './pages/Login';
import Construction from './pages/construction';

// Main App component
function App() {
  // Helpers

  // States
  const [userAuthenticated, setUserAuthenticated] = useState(false);

  // Don't worry about logging for now, however I would like to put that in a separate Logging file so the frontend code is cleaner

  // Check authentication on load
  useEffect(() => {
    // Check authentication on load
    axios
      .get('/check_auth', { withCredentials: true })
      .then((response) => {
        setUserAuthenticated(response.data.authenticated);
      })
      .catch((error) => {
        console.error('Error checking authentication:', error);
        setUserAuthenticated(false); // Default to unauthenticated on error
      });
  }, []);

  //  Visible component
  return (
    <Router>
      <div id="app-container" className="bg-gray-light">
        <div id="header-container" className="h-[min(8vh,8vw)]">
          <Header userAuthenticated={userAuthenticated} setUserAuthenticated={setUserAuthenticated} />
        </div>
        <div id="content-container" className="min-h-[calc(100vh-min(8vh,8vw))]">
            <Routes>
                <Route path='/' element={userAuthenticated ? <Navigate to="/home" /> : <Navigate to="/login" />} />
                <Route path='/home' element={<Home userAuthenticated={userAuthenticated} />} />
                <Route path='/login' element={<Login setUserAuthenticated={setUserAuthenticated} />} />
                <Route path='/construction' element={<Construction />} />
            </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;
