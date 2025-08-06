// Import dependencies
import React from 'react';

// Import components

// Import pages

// Login page component
const Login = () => {

    // Visible component
    return (
        <div className="flex w-full h-screen text-white">
            {/* Left: Logo + Title */}
            <div id="left-login" className="w-1/2 flex items-center justify-center">
                <div className="flex flex-col items-center justify-center bg-gradient-to-br from-bama-crimson via-indigo-focus to-cool-gray h-full w-full">
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
                <h1 className="text-4xl font-bold">Story Studio</h1>
                </div>
            </div>

            {/* Right: Login Form */}
            <div id="right-login" className="w-1/2 flex items-center justify-center bg-gradient-to-bl from-bama-crimson via-indigo-focus to-cool-gray">
                <div className="w-3/4 max-w-sm">
                <h1 className="text-2xl font-bold mb-2">Welcome Back</h1>
                <p className="mb-6">Please enter your details</p>

                <form className="flex flex-col gap-4">
                    <input
                    type="text"
                    placeholder="Email"
                    className="px-4 py-2 rounded-md text-black"
                    />
                    <input
                    type="password"
                    placeholder="Password"
                    className="px-4 py-2 rounded-md text-black"
                    />
                    <button
                    type="submit"
                    className="mt-2 bg-white text-bama-crimson font-semibold py-2 rounded-md hover:bg-gray-100 transition"
                    >
                    Login
                    </button>
                </form>
                </div>
            </div>
        </div>

    )
}

// Export the Login component
export default Login;