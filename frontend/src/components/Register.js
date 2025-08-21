import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { register } from '../services/api';
import { Form, Button, Container, Row, Col } from 'react-bootstrap';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import './App.css';

function Register({ setUserAuthenticated }) {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [first_name, setFirst_name] = useState('');
  const [last_name, setLast_name] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const navigate = useNavigate();

  const handleRegister = () => {
    if (password !== confirmPassword) {
      alert('Passwords do not match.');
      return;
    }

    if (password.length < 6) {
      alert('Password must be at least 6 characters long.');
      return;
    }

    register({ username, email, first_name, last_name, password })
      .then(response => {
        if (response.status === 201) {
          alert('Registration successful! Please log in.');
          navigate('/login');
        } else {
          alert(response.message || 'Registration failed.');
        }
      })
      .catch(error => {
        console.error('Registration error:', error);
        if (error.response && error.response.data && error.response.data.message) {
          alert(error.response.data.message);
        } else {
          alert('An error occurred during registration.');
        }
      });
  };

  return (
    <div className="login-container">
      <h1 className="login-title">CAST Story Board - Register</h1>
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
                    required
                  />
                </Form.Group>
                <Form.Group controlId="formFirstName">
                  <Form.Label>First Name</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="Enter your first name"
                    value={first_name}
                    onChange={(e) => setFirst_name(e.target.value)}
                    required
                  />
                </Form.Group>
                <Form.Group controlId="formLastName">
                  <Form.Label>Last Name</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="Enter your last name"
                    value={last_name}
                    onChange={(e) => setLast_name(e.target.value)}
                    required
                  />
                </Form.Group>
                
                <Form.Group controlId="formEmail">
                  <Form.Label>Email</Form.Label>
                  <Form.Control
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </Form.Group>
                
                <Form.Group controlId="formPassword" className="position-relative">
                  <Form.Label>Password</Form.Label>
                  <Form.Control
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="password-input"
                    required
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
                
                <Form.Group controlId="formConfirmPassword" className="position-relative">
                  <Form.Label>Confirm Password</Form.Label>
                  <Form.Control
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Confirm your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' ? handleRegister() : null}
                    className="password-input"
                    required
                  />
                  <div
                    className="password-icon"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                    role="button"
                    tabIndex="0"
                    onKeyPress={(e) => e.key === 'Enter' && setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                  </div>
                </Form.Group>
                
                <Button variant="primary" className="w-100" onClick={handleRegister}>
                  Register
                </Button>
                
                <Button variant="secondary" className="w-100 mt-2" onClick={() => {
                  navigate('/login');
                }}>
                  Already have an account? Login Here
                </Button>
              </Form>
            </div>
          </Col>
        </Row>
      </Container>
    </div>
  );
}

export default Register;