import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { requestPasswordReset } from '../services/api';
import { Form, Button, Container, Row, Col, Alert } from 'react-bootstrap';
import './App.css';

function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const response = await requestPasswordReset(email);
      if (response.status === 200) {
        setMessage('If an account with this email exists, a password reset link has been sent to your email.');
      }
    } catch (error) {
      setError('An error occurred while sending the reset email. Please try again.');
      console.error('Password reset request error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <h1 className="login-title">CAST Story Board</h1>
      <Container>
        <Row className="justify-content-center">
          <Col md={10} lg={8}>
            <div className="login-form">
              <h3 className="text-center mb-4">Reset Password</h3>
              
              {message && <Alert variant="success">{message}</Alert>}
              {error && <Alert variant="danger">{error}</Alert>}
              
              <Form onSubmit={handleSubmit}>
                <Form.Group controlId="formEmail">
                  <Form.Label>Email Address</Form.Label>
                  <Form.Control
                    type="email"
                    placeholder="Enter your email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </Form.Group>
                
                <Button 
                  variant="primary" 
                  className="w-100" 
                  type="submit"
                  disabled={loading}
                >
                  {loading ? 'Sending...' : 'Send Reset Link'}
                </Button>
                
                <Button 
                  variant="primary" 
                  className="w-100 mt-2" 
                  onClick={() => navigate('/login')}
                >
                  Back to Login
                </Button>
              </Form>
            </div>
          </Col>
        </Row>
      </Container>
    </div>
  );
}

export default ForgotPassword;