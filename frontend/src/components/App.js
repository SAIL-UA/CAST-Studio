// frontend/src/components/App.js

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Routes, Route, Navigate } from 'react-router-dom';
import Home from './Home';
import Login from './Login';
import Sidebar from './Sidebar';
import './App.css';

function App() {
  const [userAuthenticated, setUserAuthenticated] = useState(false);

  // For capturing click events (distance <= 10)
  const [mouseDownPos, setMouseDownPos] = useState(null);
  const [clickedElement, setClickedElement] = useState('');
  const [mouseDownTime, setMouseDownTime] = useState('');

  // Helper to figure out what was clicked
  const getElementDescription = (e) => {
    // If it’s a nav link
    if (e.target.classList?.contains('nav-link')) {
      return e.target.innerText.trim() || 'nav-link';
    }
    // If it’s a special button
    if (e.target.classList?.contains('btn')) {
      return e.target.className;
    }
    // If <img alt={image.id}>
    const alt = e.target.alt;
    if (alt) return alt;
    // Fallback
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
      // Record where we pressed
      setClickedElement(getElementDescription(e));
      setMouseDownPos({ x: e.pageX, y: e.pageY }); // Use pageX/Y
      setMouseDownTime(new Date().toISOString());
    };

    const handlePointerUp = (e) => {
      if (!userAuthenticated || !mouseDownPos) return;

      // Calculate the distance
      const dx = e.pageX - mouseDownPos.x; // Use pageX/Y
      const dy = e.pageY - mouseDownPos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // If user *really* moved (drag), skip logging here.
      // We'll rely on React DnD's logic to log that as a drag event.
      // It's effectively a click
      const time = mouseDownTime || new Date().toISOString();
      axios
        .post(
          '/log_click',
          {
            objectClicked: clickedElement,
            time: time,
            mouseDownPosition: mouseDownPos,
            mouseUpPosition: { x: e.pageX, y: e.pageY }, // Use pageX/Y
            interaction: 'click', // Specify interaction type
          },
          { withCredentials: true }
        )
        .then(() => console.log('Click logged successfully'))
        .catch((err) => console.error('Error logging click:', err));

      // Reset
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

  const isLoginPage = window.location.pathname === '/login';

  return (
    <div className={`App ${isLoginPage ? 'no-sidebar' : ''}`}>
      {userAuthenticated && !isLoginPage && (
        <Sidebar handleLogout={handleLogout} />
      )}
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
          <Route path="/" element={<Navigate to="/login" />} />
        </Routes>
      </div>
    </div>
  );
}

export default App;
