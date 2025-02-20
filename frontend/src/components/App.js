// frontend/src/components/App.js

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Home from './Home';
import Login from './Login';
import Sidebar from './Sidebar';
import './App.css';

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
      setMouseDownTime(new Date().toISOString());
    };

    const handlePointerUp = (e) => {
      if (!userAuthenticated || !mouseDownPos) return;

      const dx = e.pageX - mouseDownPos.x;
      const dy = e.pageY - mouseDownPos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      const time = mouseDownTime || new Date().toISOString();
      axios
        .post(
          '/log_click',
          {
            objectClicked: clickedElement,
            time: time,
            mouseDownPosition: mouseDownPos,
            mouseUpPosition: { x: e.pageX, y: e.pageY },
            interaction: 'click',
          },
          { withCredentials: true }
        )
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

  const handleLogout = () => {
    axios
      .post('/logout', {}, { withCredentials: true })
      .then(() => {
        setUserAuthenticated(false);
      })
      .catch((error) => {
        console.error('Logout error:', error);
      });
  };

  const isLoginPage = location.pathname === '/login';

  // While authentication status is being determined, show a loading state
  if (userAuthenticated === null) {
    return <div className="loading-screen">Loading...</div>;
  }

  return (
    <div className={`App ${isLoginPage ? 'no-sidebar' : ''}`}>
      {userAuthenticated && !isLoginPage && <Sidebar handleLogout={handleLogout} />}
      <div className="content">
        <Routes>
          <Route
            path="/login"
            element={<Login setUserAuthenticated={setUserAuthenticated} />}
          />
          <Route
            path="/home"
            element={userAuthenticated ? <Home /> : <Navigate to="/login" />}
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
