import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../services/api';
import { Form, Button, Container, Row, Col } from 'react-bootstrap';
import { FaEye, FaEyeSlash } from 'react-icons/fa'; // Import eye icons for toggling password visibility
import './App.css'; // Ensure updated styles are imported
// import { BACKEND_URL } from './App.js';

function Login({ setUserAuthenticated }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false); // State to toggle password visibility
  const navigate = useNavigate();

  const handleLogin = () => {
    login({ username, password })
      .then(response => {
        if (response.status === 200) {
          setUserAuthenticated(true);
          navigate('/home');
        } else {
          alert('Login failed.');
        }
      })
      .catch(error => {
        console.error('Login error:', error);
        alert('An error occurred during login.');
      });
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className="login-container">
      <h1 className="login-title">CAST Story Board</h1>
      <Container>
        <Row className="justify-content-center">
          <Col md={10} lg={8}>
            <div className="login-form">
              <Form>
                <Form.Group controlId="formUsername">
                  <Form.Label>Username</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="Enter your username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' ? handleLogin() : null}
                  />
                </Form.Group>
                <Form.Group controlId="formPassword" className="position-relative">
                  <Form.Label>Password</Form.Label>
                  <Form.Control
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' ? handleLogin() : null}
                    className="password-input"
                  />
                  <div
                    className="password-icon"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    role="button"
                    tabIndex="0"
                    onKeyPress={(e) => e.key === 'Enter' && setShowPassword(!showPassword)}
                  >
                    {showPassword ? <FaEyeSlash /> : <FaEye />}
                  </div>
                </Form.Group>
                <Button variant="primary" className="w-100" onClick={handleLogin}>
                  Login
                </Button>
                <Button variant="primary" className="w-100" onClick={() => {
                  navigate('/register');
                }}>
                  New User? Register Here
                </Button>
              </Form>
            </div>
          </Col>
        </Row>
      </Container>
    </div>
  );
}

export default Login;
