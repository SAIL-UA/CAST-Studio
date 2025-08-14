// Import dependencies
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// Import providers
import { useAuth } from './contexts/Auth';

// Import pages
import Home from './pages/Home';
import Login from './pages/Login';
import Construction from './pages/construction';

// Main App component
function App() {
  // Don't worry about logging for now, however I would like to put that in a separate Logging file so the frontend code is cleaner
  
  // Contexts
  const { userAuthenticated } = useAuth();

  //  Visible component
  return (
    <Router>
      <div id="app-container" className="bg-grey-lighter font-roboto-regular">
            <Routes>
                <Route path='/' element={userAuthenticated ? <Navigate to="/home" /> : <Navigate to="/login" />} />
                <Route path='/home' element={<Home />} />
                <Route path='/login' element={<Login />} />
                <Route path='/construction' element={<Construction />} />
            </Routes>
      </div>
    </Router>
  );
}

export default App;
