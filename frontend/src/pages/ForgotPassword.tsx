// Import dependencies
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

// Import API functions
import { requestPasswordReset } from '../services/api';

// Forgot Password component
const ForgotPassword = () => {
    // Helpers
    const navigate = useNavigate();

    // State
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    // Handle password reset request
    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setMessage('');

        try {
            await requestPasswordReset(email);
            // Navigate to code verification page with email
            navigate(`/verify-reset-code?email=${encodeURIComponent(email)}`);
        } catch (err: any) {
            setError(err.response?.data?.detail || 'An error occurred while sending the reset email.');
        } finally {
            setLoading(false);
        }
    };

    // Visible component
    return (
        <div className="flex w-full h-screen text-white">
            {/* Left: Logo + Title */}
            <div id="left-forgot-password" className="w-1/2 flex items-center justify-center">
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
                    <h3 className="text-2xl font-light mb-2 text-white">Reset your password</h3>
                </div>
            </div>

            {/* Right: Forgot Password Form */}
            <div id="right-forgot-password" className="w-1/2 flex items-center justify-center bg-gradient-to-bl from-bama-crimson via-bama-teal to-grey-light">
                <div className="w-3/4 max-w-sm">
                    <h1 className="text-3xl font-semibold mb-2 text-white">
                        Forgot Password
                    </h1>
                    <p className="text-white mb-6 text-sm">
                        Enter your email address and we'll send you a link to reset your password.
                    </p>

                    <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
                        <input
                            type="email"
                            placeholder="Enter your email address"
                            value={email}
                            className="px-4 py-2 rounded-md text-black"
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            disabled={loading}
                        />

                        <button
                            type="submit"
                            disabled={loading}
                            className="mt-2 bg-grey-light text-bama-crimson font-semibold py-2 rounded-md hover:bg-grey-lightest transition disabled:opacity-50"
                        >
                            {loading ? 'Sending...' : 'Send Reset Link'}
                        </button>
                    </form>

                    {/* Success/Error Messages */}
                    {message && (
                        <div className="mt-4 p-3 bg-green-600 text-white rounded-md text-sm">
                            {message}
                        </div>
                    )}
                    {error && (
                        <div className="mt-4 p-3 bg-red-600 text-white rounded-md text-sm">
                            {error}
                        </div>
                    )}

                    {/* Back to login link */}
                    <div className="text-center mt-4">
                        <Link
                            to="/login"
                            className="text-white underline hover:text-grey-lightest transition"
                        >
                            Back to Login
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ForgotPassword;