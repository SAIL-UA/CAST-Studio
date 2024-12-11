import React, { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';
import Home from './Home';
import Login from './Login';
import './App.css';
import Sidebar from './Sidebar'; // Adjust the path if necessary

function App() {
  const [userAuthenticated, setUserAuthenticated] = useState(false);

  const handleLogout = () => {
    axios.post('/logout', {}, { withCredentials: true })
      .then(() => {
        setUserAuthenticated(false);
      })
      .catch(error => {
        console.error('Logout error:', error);
      });
  };

  // Determine if the sidebar space should be allocated
  const isLoginPage = window.location.pathname === '/login';

  return (
    <div className={`App ${isLoginPage ? 'no-sidebar' : ''}`}>
      {userAuthenticated && !isLoginPage && (
        <Sidebar handleLogout={handleLogout} />
      )}
      <div className="content">
        <Routes>
          <Route path="/login" element={<Login setUserAuthenticated={setUserAuthenticated} />} />
          <Route
            path="/home"
            element={userAuthenticated ? <Home /> : <Navigate to="/login" />}
          />
          <Route path="/" element={<Navigate to="/login" />} />
        </Routes>
      </div>
    </div>
  );
}

export default App;
