// frontend/src/components/App.js

import React, { useState, useEffect } from 'react';
import { getEasternISO } from '../utils/datetimeUtils';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { checkAuth, logout, logClick } from '../services/api';
import Home from './Home';
import Login from './Login';
import Register from './Register';
import Sidebar from './Sidebar';
import './App.css';
// In App.js
import Tutorial from './Tutorial';


function App() {
  const [userAuthenticated, setUserAuthenticated] = useState(null); // Initially null to represent loading state
  const location = useLocation();
  

  // For capturing click events (distance <= 10)
  const [mouseDownPos, setMouseDownPos] = useState(null);
  const [clickedElement, setClickedElement] = useState('');
  const [mouseDownTime, setMouseDownTime] = useState('');

  // Helper to figure out what was clicked
  const getElementDescription = (e) => {
    if (e.target.classList?.contains('nav-link')) {
      return e.target.innerText.trim() || 'nav-link';
    }
    if (e.target.classList?.contains('btn')) {
      return e.target.className;
    }
    const alt = e.target.alt;
    if (alt) return alt;
    return (
      e.target.id ||
      e.target.getAttribute('data-element') ||
      e.target.className ||
      e.target.tagName
    );
  };

  useEffect(() => {
    const handlePointerDown = (e) => {
      if (!userAuthenticated) return;
      setClickedElement(getElementDescription(e));
      setMouseDownPos({ x: e.pageX, y: e.pageY });
      setMouseDownTime(getEasternISO());
    };

    const handlePointerUp = (e) => {
      if (!userAuthenticated || !mouseDownPos) return;

      // const dx = e.pageX - mouseDownPos.x;
      // const dy = e.pageY - mouseDownPos.y;
      // const dist = Math.sqrt(dx * dx + dy * dy);

      const time = mouseDownTime || getEasternISO();

      

      logClick({
            objectClicked: clickedElement,
            time: time,
            mouseDownPosition: mouseDownPos,
            mouseUpPosition: { x: e.pageX, y: e.pageY },
            interaction: 'click',
          })
        .catch((err) => console.error('Error logging click:', err));

      setMouseDownPos(null);
      setClickedElement('');
      setMouseDownTime('');
    };

    window.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('pointerup', handlePointerUp);

    return () => {
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [userAuthenticated, mouseDownPos, clickedElement, mouseDownTime]);

  useEffect(() => {
    // Check authentication on load
    checkAuth()
      .then((response) => {
        setUserAuthenticated(response.authenticated);
      })
      .catch((error) => {
        console.error('Error checking authentication:', error);
        setUserAuthenticated(false); // Default to unauthenticated on error
      });
  }, []);

  const handleLogout = () => {
    logout()
      .then(() => {
        setUserAuthenticated(false);
      })
      .catch((error) => {
        console.error('Logout error:', error);
      });
  };

  const isLoginPage = location.pathname === '/login';
  const isRegisterPage = location.pathname === '/register';

  // While authentication status is being determined, show a loading state
  if (userAuthenticated === null) {
    return <div className="loading-screen">Loading...</div>;
  }

  return (
    <div className={`App ${isLoginPage || isRegisterPage ? 'no-sidebar' : ''}`}>
      {userAuthenticated && !isLoginPage && !isRegisterPage && <Sidebar handleLogout={handleLogout} />}
      <div className="content">
        <Routes>
          <Route
            path="/login"
            element={userAuthenticated ? <Navigate to="/home" /> : <Login setUserAuthenticated={setUserAuthenticated} />}
          />
          <Route
            path="/register"
            element={userAuthenticated ? <Navigate to="/home" /> : <Register setUserAuthenticated={setUserAuthenticated} />}
          />
          <Route
            path="/home"
            element={userAuthenticated ? <Home /> : <Navigate to="/login" />}
          />
          <Route
            path="/tutorial"
            element={userAuthenticated ? <Tutorial /> : <Navigate to="/login" />}
          />
          <Route
            path="/"
            element={
              userAuthenticated ? <Navigate to="/home" /> : <Navigate to="/login" />
            }
          />
        </Routes>
      </div>
    </div>
  );
}

export default App;
