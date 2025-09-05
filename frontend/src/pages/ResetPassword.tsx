// Import dependencies
import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';

// Import API functions
import { confirmPasswordReset } from '../services/api';

// Reset Password component
const ResetPassword = () => {
    // Helpers
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const emailFromUrl = searchParams.get('email') || '';
    const codeFromUrl = searchParams.get('code') || '';

    // State
    const [email] = useState(emailFromUrl);
    const [code] = useState(codeFromUrl);
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    // Redirect to forgot password if no email/code (shouldn't happen in normal flow)
    useEffect(() => {
        if (!email || !code) {
            navigate('/forgot-password');
        }
    }, [email, code, navigate]);

    // Handle password reset confirmation
    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setMessage('');

        // Validation
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
            await confirmPasswordReset(email, code, newPassword, confirmPassword);
            setMessage('Password has been reset successfully! You can now log in with your new password.');
            setNewPassword('');
            setConfirmPassword('');
            
            // Redirect to login after 3 seconds
            setTimeout(() => {
                navigate('/login');
            }, 3000);
        } catch (err: any) {
            if (err.response?.data?.non_field_errors) {
                setError(err.response.data.non_field_errors[0]);
            } else {
                setError(err.response?.data?.detail || 'An error occurred while resetting your password.');
            }
        } finally {
            setLoading(false);
        }
    };

    // Visible component
    return (
        <div className="flex w-full h-screen text-white">
            {/* Left: Logo + Title */}
            <div id="left-reset-password" className="w-1/2 flex items-center justify-center">
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
                    <h3 className="text-2xl font-light mb-2 text-white">Create a new password</h3>
                </div>
            </div>

            {/* Right: Reset Password Form */}
            <div id="right-reset-password" className="w-1/2 flex items-center justify-center bg-gradient-to-bl from-bama-crimson via-bama-teal to-grey-light">
                <div className="w-3/4 max-w-sm">
                    <h1 className="text-3xl font-semibold mb-2 text-white">
                        Reset Password
                    </h1>
                    <p className="text-white mb-6 text-sm">
                        Enter your new password below.
                    </p>

                    <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
                        <input
                            type="password"
                            placeholder="New password"
                            value={newPassword}
                            className="px-4 py-2 rounded-md text-black"
                            onChange={(e) => setNewPassword(e.target.value)}
                            required
                            disabled={loading}
                            minLength={8}
                        />

                        <input
                            type="password"
                            placeholder="Confirm new password"
                            value={confirmPassword}
                            className="px-4 py-2 rounded-md text-black"
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                            disabled={loading}
                            minLength={8}
                        />

                        <button
                            type="submit"
                            disabled={loading}
                            className="mt-2 bg-grey-light text-bama-crimson font-semibold py-2 rounded-md hover:bg-grey-lightest transition disabled:opacity-50"
                        >
                            {loading ? 'Resetting...' : 'Reset Password'}
                        </button>
                    </form>

                    {/* Success/Error Messages */}
                    {message && (
                        <div className="mt-4 p-3 bg-green-600 text-white rounded-md text-sm">
                            {message}
                            <div className="mt-2 text-xs">
                                Redirecting to login in 3 seconds...
                            </div>
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

export default ResetPassword;