// Import dependencies
import { useNavigate, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';

// Import context
import { useAuth } from '../contexts/Auth';
import { login, register } from '../services/api';

// Import components

// Import pages

// Login page component
const Login = () => {
    // Helpers
    const navigate = useNavigate();
    const { userAuthenticated, setUserAuthenticated, setUsername } = useAuth();
    
    // States
    const [isRegisterMode, setIsRegisterMode] = useState(false);
    const [usernameInput, setUsernameInput] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [email, setEmail] = useState('');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);

    // Check authentication
    useEffect(() => {
        if (userAuthenticated) {
            navigate('/home');
        }
    }, [userAuthenticated, navigate]);

    // Login functionality
    const handleLogin = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccess('');
        
        login({ username: usernameInput, password })
          .then(response => {
            if (response.status === 200) {
              setUserAuthenticated(true);
              setUsername(response.data.user.username);
              navigate('/home');
            } else {
              setError('Login failed. Please check your credentials.');
            }
          })
          .catch(error => {
            console.error('Login error:', error);
            if (error.response?.status === 401) {
              setError('Invalid username or password.');
            } else {
              setError('An error occurred during login. Please try again.');
            }
          })
          .finally(() => {
            setLoading(false);
          });
    };

    // Registration functionality
    const handleRegister = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccess('');
        
        // Validation
        if (password !== confirmPassword) {
            setError('Passwords do not match.');
            setLoading(false);
            return;
        }
        
        if (!usernameInput || !password || !email || !firstName || !lastName) {
            setError('Please fill in all fields.');
            setLoading(false);
            return;
        }

        const userData = {
            username: usernameInput,
            password,
            email,
            first_name: firstName,
            last_name: lastName
        };

        register(userData)
          .then(response => {
            if (response.status === 201) {
              setSuccess('Registration successful! Please log in.');
              setIsRegisterMode(false);
              // Clear registration fields
              setConfirmPassword('');
              setEmail('');
              setFirstName('');
              setLastName('');
            } else {
              setError('Registration failed. Please try again.');
            }
          })
          .catch(error => {
            console.error('Registration error:', error);
            if (error.response?.data?.username) {
              setError('Username already exists. Please choose a different username.');
            } else if (error.response?.data?.email) {
              setError('Email already exists. Please use a different email address.');
            } else if (error.response?.data?.message) {
              setError(error.response.data.message);
            } else {
              setError('An error occurred during registration. Please try again.');
            }
          })
          .finally(() => {
            setLoading(false);
          });
    };

    // Toggle between login and register modes
    const toggleMode = () => {
        setIsRegisterMode(!isRegisterMode);
        // Clear all fields when switching modes
        setUsernameInput('');
        setPassword('');
        setConfirmPassword('');
        setEmail('');
        setFirstName('');
        setLastName('');
        setError('');
        setSuccess('');
    };

    // Visible component
    return (
        <div className="flex w-full h-screen text-white">
            {/* Left: Logo + Title */}
            <div id="left-login" className="w-1/2 flex items-center justify-center">
                <div className="flex flex-col items-center justify-center bg-gradient-to-br from-bama-crimson via-bama-teal to-grey-light h-full w-full">
                <svg
                    className="w-1/4 h-1/4 mx-auto mb-2 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                >
                    <path d="M12 .75a8.25 8.25 0 0 0-4.135 15.39c.686.398 1.115 1.008 1.134 1.623a.75.75 0 0 0 .577.706c.352.083.71.148 1.074.195.323.041.6-.218.6-.544v-4.661a6.714 6.714 0 0 1-.937-.171.75.75 0 1 1 .374-1.453 5.261 5.261 0 0 0 2.626 0 .75.75 0 1 1 .374 1.452 6.712 6.712 0 0 1-.937.172v4.66c0 .327.277.586.6.545.364-.047.722-.112 1.074-.195a.75.75 0 0 0 .577-.706c.02-.615.448-1.225 1.134-1.623A8.25 8.25 0 0 0 12 .75Z" />
                    <path
                    fillRule="evenodd"
                    d="M9.013 19.9a.75.75 0 0 1 .877-.597 11.319 11.319 0 0 0 4.22 0 .75.75 0 1 1 .28 1.473 12.819 12.819 0 0 1-4.78 0 .75.75 0 0 1-.597-.876ZM9.754 22.344a.75.75 0 0 1 .824-.668 13.682 13.682 0 0 0 2.844 0 .75.75 0 1 1 .156 1.492 15.156 15.156 0 0 1-3.156 0 .75.75 0 0 1-.668-.824Z"
                    clipRule="evenodd"
                    />
                </svg>
                <h1 className="text-7xl font-semibold mb-2 text-white font-roboto-bold">StoryStudio</h1>
                <h3 className="text-2xl font-light mb-2 text-white">Create compelling data-driven stories.</h3>
                <p className="text-sm font-light mb-2 text-white">Collaborators: UA, UMBC, SRI International. <a href='https://www.nsf.gov/funding/opportunities/ritel-research-innovative-technologies-enhanced-learning' target='_blank' rel='noreferrer' className='underline'>Learn more</a> about CAST and NSF RITEL.</p>
                </div>
            </div>

            {/* Right: Login/Register Form */}
            <div id="right-login" className="w-1/2 flex items-center justify-center bg-gradient-to-bl from-bama-crimson via-bama-teal to-grey-light">
                <div className="w-3/4 max-w-sm">
                    <h1 className="text-3xl font-semibold mb-2 text-white">
                        {isRegisterMode ? 'Create Account' : 'Welcome!'}
                    </h1><br/>

                    <form className="flex flex-col gap-4" 
                    onSubmit={isRegisterMode ? handleRegister : handleLogin}>
                        {/* Registration-only fields */}
                        {isRegisterMode && (
                            <>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        placeholder="First Name"
                                        value={firstName}
                                        className="px-4 py-2 rounded-md text-black flex-1"
                                        onChange={(e) => setFirstName(e.target.value)}
                                        required
                                    />
                                    <input
                                        type="text"
                                        placeholder="Last Name"
                                        value={lastName}
                                        className="px-4 py-2 rounded-md text-black flex-1"
                                        onChange={(e) => setLastName(e.target.value)}
                                        required
                                    />
                                </div>
                                <input
                                    type="email"
                                    placeholder="Email"
                                    value={email}
                                    className="px-4 py-2 rounded-md text-black"
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                            </>
                        )}

                        {/* Common fields */}
                        <input
                            type="text"
                            placeholder="Username"
                            value={usernameInput}
                            className="px-4 py-2 rounded-md text-black"
                            onChange={(e) => setUsernameInput(e.target.value)}
                            required
                        />
                        <input
                            type="password"
                            placeholder="Password"
                            value={password}
                            className="px-4 py-2 rounded-md text-black"
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />

                        {/* Registration-only confirm password */}
                        {isRegisterMode && (
                            <input
                                type="password"
                                placeholder="Confirm Password"
                                value={confirmPassword}
                                className="px-4 py-2 rounded-md text-black"
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                            />
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="mt-2 bg-grey-light text-bama-crimson font-semibold py-2 rounded-md hover:bg-grey-lightest transition disabled:opacity-50"
                        >
                            {loading ? (isRegisterMode ? 'Creating Account...' : 'Logging in...') : (isRegisterMode ? 'Register' : 'Login')}
                        </button>
                    </form>

                    {/* Success/Error Messages */}
                    {error && (
                        <div className="mt-4 p-3 bg-red-600 text-white rounded-md text-sm">
                            {error}
                        </div>
                    )}
                    {success && (
                        <div className="mt-4 p-3 bg-green-600 text-white rounded-md text-sm">
                            {success}
                        </div>
                    )}

                    {/* Forgot password link - only show in login mode */}
                    {!isRegisterMode && (
                        <div className="text-center mt-3">
                            <Link
                                to="/forgot-password"
                                className="text-white text-sm underline hover:text-grey-lightest transition"
                            >
                                Forgot your password?
                            </Link>
                        </div>
                    )}

                    {/* Toggle between login and register */}
                    <div className="text-center mt-4">
                        <button
                            type="button"
                            onClick={toggleMode}
                            className="text-white underline hover:text-grey-lightest transition"
                        >
                            {isRegisterMode 
                                ? 'Already have an account? Login' 
                                : 'Need an account? Register'}
                        </button>
                    </div>
                </div>
            </div>
        </div>

    )
}

// Export the Login component
export default Login;