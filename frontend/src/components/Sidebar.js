import React, { useState } from 'react';
import { Navbar, Nav } from 'react-bootstrap';
import { Link, useLocation } from 'react-router-dom';
import { FaBars } from 'react-icons/fa';

function Sidebar({ handleLogout }) {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  const toggleSidebar = () => {
    setCollapsed(!collapsed);
  };

  return (
    <div className={`sidebar ${collapsed ? 'collapsed' : 'open'}`}>
      {/* Toggle Button Inside the Sidebar */}
      <div
        className={`sidebar-toggle ${collapsed ? 'collapsed' : 'open'}`}
        onClick={toggleSidebar}
      >
        <FaBars />
      </div>

      <div className="sidebar-content">
        <Navbar expand="lg" className="flex-column">
          <Navbar.Brand className="sidebar-brand">CAST-UA</Navbar.Brand>
          <Nav className="flex-column">
            <Nav.Link
              as={Link}
              to="/home"
              className={location.pathname === '/home' ? 'nav-link active' : 'nav-link'}
            >
              Home
            </Nav.Link>
            <Nav.Link
              as={Link}
              to="/about"
              className={location.pathname === '/about' ? 'nav-link active' : 'nav-link'}
            >
              About the Data
            </Nav.Link>
            <Nav.Link
              as={Link}
              to="/resources"
              className={location.pathname === '/resources' ? 'nav-link active' : 'nav-link'}
            >
              Resources
            </Nav.Link>
            <Nav.Link
              as={Link}
              to="/contact"
              className={location.pathname === '/contact' ? 'nav-link active' : 'nav-link'}
            >
              Contact Us
            </Nav.Link>
            <Nav.Link
              as="button"
              className="logout-link"
              onClick={handleLogout}
            >
              Logout
            </Nav.Link>
          </Nav>
        </Navbar>
        {/* Logo Positioned at the Bottom */}
        <div className="logo-container">
          <img src="/images/UAENGLog.png" alt="Logo" />
        </div>
      </div>
    </div>
  );
}

export default Sidebar;
