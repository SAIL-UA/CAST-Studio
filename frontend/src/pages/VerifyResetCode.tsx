// Import dependencies
import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';

// Import API functions
import { verifyResetCode, requestPasswordReset } from '../services/api';

// Verify Reset Code component
const VerifyResetCode = () => {
    // Helpers
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const emailFromUrl = searchParams.get('email') || '';

    // State
    const [email] = useState(emailFromUrl);
    const [codeDigits, setCodeDigits] = useState(['', '', '', '', '', '']);
    const [loading, setLoading] = useState(false);
    const [resendLoading, setResendLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    
    // Refs for input boxes
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

    // If no email in URL, redirect back to forgot password
    useEffect(() => {
        if (!email) {
            navigate('/forgot-password');
        }
    }, [email, navigate]);

    // Auto-focus first input on load
    useEffect(() => {
        inputRefs.current[0]?.focus();
    }, []);

    // Handle individual digit input
    const handleDigitChange = (index: number, value: string) => {
        // Only allow numbers
        if (!/^\d?$/.test(value)) return;
        
        const newDigits = [...codeDigits];
        newDigits[index] = value;
        setCodeDigits(newDigits);
        
        // Auto-advance to next input if digit entered
        if (value && index < 5) {
            inputRefs.current[index + 1]?.focus();
        }
    };
    
    // Handle backspace and navigation
    const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Backspace') {
            if (!codeDigits[index] && index > 0) {
                // If current box is empty, move to previous box
                inputRefs.current[index - 1]?.focus();
            }
        } else if (e.key === 'ArrowLeft' && index > 0) {
            inputRefs.current[index - 1]?.focus();
        } else if (e.key === 'ArrowRight' && index < 5) {
            inputRefs.current[index + 1]?.focus();
        }
    };
    
    // Handle paste
    const handlePaste = (e: React.ClipboardEvent) => {
        e.preventDefault();
        const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
        const newDigits = ['', '', '', '', '', ''];
        
        for (let i = 0; i < pastedData.length; i++) {
            newDigits[i] = pastedData[i];
        }
        
        setCodeDigits(newDigits);
        
        // Focus the next empty box or last box
        const nextIndex = Math.min(pastedData.length, 5);
        inputRefs.current[nextIndex]?.focus();
    };

    // Handle code verification
    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const code = codeDigits.join('');
        
        if (code.length !== 6) return;
        
        setLoading(true);
        setError('');
        setMessage('');
        setCodeDigits(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus(); // Focus first input
        
        try {
            const response = await verifyResetCode(email, code);
            if (response.status === 200) {
                // Navigate to password reset with email and code
                navigate(`/reset-password?email=${encodeURIComponent(email)}&code=${encodeURIComponent(code)}`);
            } else {
                setError(response.data.detail || 'Invalid or expired code.');
            }
        } catch (err: any) {
            if (err.response?.data?.non_field_errors) {
                setError(err.response.data.non_field_errors[0]);
            } else {
                setError(err.response?.data?.detail || 'Invalid or expired code.');
            }
        } finally {
            setLoading(false);
        }
    };

    // Handle resend code
    const handleResendCode = async () => {
        setResendLoading(true);
        setError('');
        setMessage('');

        try {
            await requestPasswordReset(email);
            setMessage('A new code has been sent to your email.\nBe sure to verify the email address you provided and check your spam folder.');
            setCodeDigits(['', '', '', '', '', '']); // Clear all code fields
            inputRefs.current[0]?.focus(); // Focus first input
        } catch (err: any) {
            setError('Failed to resend code. Please try again.');
        } finally {
            setResendLoading(false);
        }
    };

    // Visible component
    return (
        <div className="flex w-full h-screen text-white">
            {/* Left: Logo + Title */}
            <div id="left-verify-code" className="w-1/2 flex items-center justify-center">
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
                    <h3 className="text-2xl font-light mb-2 text-white">Enter verification code</h3>
                </div>
            </div>

            {/* Right: Code Verification Form */}
            <div id="right-verify-code" className="w-1/2 flex items-center justify-center bg-gradient-to-bl from-bama-crimson via-bama-teal to-grey-light">
                <div className="w-3/4 max-w-sm">
                    <h1 className="text-3xl font-semibold mb-2 text-white">
                        Enter Code
                    </h1>
                    <p className="text-white mb-4 text-sm">
                        We've sent a 6-digit verification code to:
                    </p>
                    <p className="text-white mb-6 text-sm font-semibold">
                        {email}
                    </p>

                    <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
                        {/* 6-digit code input boxes */}
                        <div className="flex justify-center gap-2 mb-4">
                            {codeDigits.map((digit, index) => (
                                <input
                                    key={index}
                                    ref={(el) => {
                                        inputRefs.current[index] = el;
                                    }}
                                    type="text"
                                    inputMode="numeric"
                                    value={digit}
                                    onChange={(e) => handleDigitChange(index, e.target.value)}
                                    onKeyDown={(e) => handleKeyDown(index, e)}
                                    onPaste={handlePaste}
                                    className="w-12 h-12 text-center text-xl font-bold rounded-md border-2 border-gray-300 focus:border-bama-crimson focus:outline-none text-black"
                                    maxLength={1}
                                    disabled={loading || resendLoading}
                                />
                            ))}
                        </div>

                        <button
                            type="submit"
                            disabled={loading || codeDigits.join('').length !== 6}
                            className="mt-2 bg-grey-light text-bama-crimson font-semibold py-2 rounded-md hover:bg-grey-lightest transition disabled:opacity-50"
                        >
                            {loading ? 'Verifying...' : 'Verify Code'}
                        </button>
                    </form>

                    {/* Success/Error Messages */}
                    {error && (
                        <div className="mt-4 p-3 bg-red-600 text-white rounded-md text-sm">
                            {error}
                        </div>
                    )}
                    {message && (
                        <div className="mt-4 p-3 bg-green-600 text-white rounded-md text-sm">
                            {message}
                        </div>
                    )}

                    {/* Resend code */}
                    <div className="text-center mt-4">
                        <button
                            type="button"
                            onClick={handleResendCode}
                            disabled={resendLoading}
                            className="text-white text-sm underline hover:text-grey-lightest transition disabled:opacity-50"
                        >
                            {resendLoading ? 'Sending...' : 'Didn\'t receive the code? Resend'}
                        </button>
                    </div>

                    {/* Back to forgot password */}
                    <div className="text-center mt-2">
                        <Link
                            to="/forgot-password"
                            className="text-white text-sm underline hover:text-grey-lightest transition"
                        >
                            Change email address
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VerifyResetCode;