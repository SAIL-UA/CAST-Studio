// Import dependencies
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';

// Import providers
import { useAuth } from './contexts/Auth';

// Import services
import { mouseTracker } from './utils/mouseTracker';

// Import pages
import Home from './pages/Home';
import Login from './pages/Login';
import Construction from './pages/construction';
import ForgotPassword from './pages/ForgotPassword';
import VerifyResetCode from './pages/VerifyResetCode';
import ResetPassword from './pages/ResetPassword';

// Main App component
function App() {
  // Contexts
  const { userAuthenticated } = useAuth();

  // Start mouse tracking when app mounts
  useEffect(() => {
    // Only start tracking if user is authenticated
    if (userAuthenticated) {
      mouseTracker.start();
    } else {
      mouseTracker.stop();
    }
    
    // Cleanup on unmount
    return () => {
      mouseTracker.stop();
    };
  }, [userAuthenticated]);

  //  Visible component
  return (
    <Router>
      <div id="app-container" className="bg-grey-lighter font-roboto-regular">
            <Routes>
                <Route path='/' element={userAuthenticated ? <Navigate to="/home" /> : <Navigate to="/login" />} />
                <Route path='/home' element={<Home />} />
                <Route path='/login' element={<Login />} />
                <Route path='/forgot-password' element={<ForgotPassword />} />
                <Route path='/verify-reset-code' element={<VerifyResetCode />} />
                <Route path='/reset-password' element={<ResetPassword />} />
                <Route path='/construction' element={<Construction />} />
            </Routes>
      </div>
    </Router>
  );
}

export default App;
