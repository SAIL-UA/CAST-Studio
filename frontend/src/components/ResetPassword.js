import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { confirmPasswordReset } from '../services/api';
import { Form, Button, Container, Row, Col, Alert } from 'react-bootstrap';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import './App.css';

function ResetPassword() {
  const { uid, token } = useParams();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      setLoading(false);
      return;
    }

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long.');
      setLoading(false);
      return;
    }

    try {
      const response = await confirmPasswordReset(uid, token, newPassword, confirmPassword);
      if (response.status === 200) {
        setMessage('Password has been reset successfully. You can now log in with your new password.');
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      }
    } catch (error) {
      if (error.response?.status === 400) {
        setError(error.response.data.detail || 'Invalid or expired reset link.');
      } else {
        setError('An error occurred while resetting your password. Please try again.');
      }
      console.error('Password reset error:', error);
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
              <h3 className="text-center mb-4">Set New Password</h3>
              
              {message && <Alert variant="success">{message}</Alert>}
              {error && <Alert variant="danger">{error}</Alert>}
              
              <Form onSubmit={handleSubmit}>
                <Form.Group controlId="formNewPassword" className="position-relative">
                  <Form.Label>New Password</Form.Label>
                  <Form.Control
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your new password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
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
                  <Form.Label>Confirm New Password</Form.Label>
                  <Form.Control
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Confirm your new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
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
                
                <Button 
                  variant="primary" 
                  className="w-100" 
                  type="submit"
                  disabled={loading}
                >
                  {loading ? 'Resetting...' : 'Reset Password'}
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

export default ResetPassword;