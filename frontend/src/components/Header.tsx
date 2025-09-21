// Import dependencies
import { useNavigate } from 'react-router-dom';

// Import contexts
import { useAuth } from '../contexts/Auth';
import { logout } from '../services/api';

// Header component
const Header = () => {

    // Helpers
    const navigate = useNavigate();
    
    // Contexts
    const { userAuthenticated, setUserAuthenticated, username, setUsername } = useAuth();

    // Search functionality
    const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        navigate('/construction');
    }

    // Logout functionality
    const handleLogout = () => {
        logout()
            .then(() => {
                setUserAuthenticated(false);
                setUsername(null);
                navigate('/login');
            })
            .catch((error) => {
                setUserAuthenticated(true);
                console.error('Logout error:', error);
            });
    };

    // Visible component
    return (
        <div id="header-container" className='fixed w-screen z-10 bg-bama-crimson text-center p-4 px-6 flex items-center'>
            <header className="h-full w-full sticky top-0 bg-bama-crimson flex items-center px-6">
                {/* Left: Logo + Title */}
                <div className="w-1/5">
                    <div onClick={() => navigate('/')}
                    className="flex items-center w-min cursor-pointer">
                        <svg
                        className="w-5 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="white"
                        >
                            <path d="M12 .75a8.25 8.25 0 0 0-4.135 15.39c.686.398 1.115 1.008 1.134 1.623a.75.75 0 0 0 .577.706c.352.083.71.148 1.074.195.323.041.6-.218.6-.544v-4.661a6.714 6.714 0 0 1-.937-.171.75.75 0 1 1 .374-1.453 5.261 5.261 0 0 0 2.626 0 .75.75 0 1 1 .374 1.452 6.712 6.712 0 0 1-.937.172v4.66c0 .327.277.586.6.545.364-.047.722-.112 1.074-.195a.75.75 0 0 0 .577-.706c.02-.615.448-1.225 1.134-1.623A8.25 8.25 0 0 0 12 .75Z" />
                            <path fillRule="evenodd"
                            d="M9.013 19.9a.75.75 0 0 1 .877-.597 11.319 11.319 0 0 0 4.22 0 .75.75 0 1 1 .28 1.473 12.819 12.819 0 0 1-4.78 0 .75.75 0 0 1-.597-.876ZM9.754 22.344a.75.75 0 0 1 .824-.668 13.682 13.682 0 0 0 2.844 0 .75.75 0 1 1 .156 1.492 15.156 15.156 0 0 1-3.156 0 .75.75 0 0 1-.668-.824Z"
                            clipRule="evenodd"
                            />
                        </svg>
                        <p className="text-white font-roboto-semibold ml-2 mt-1 text-lg">StoryStudio</p>
                    </div>
                </div>

                {/* Center: Search Bar */}
                <div className="flex justify-center items-center w-3/5 h-full">
                    <div className="relative w-full h-[55%]">
                        <form className="w-full h-full" 
                        onSubmit={(e: React.FormEvent<HTMLFormElement>) => handleSearch(e)}>
                            <input id="home-search-bar"
                                type="search"
                                placeholder="Search"
                                className="w-full font-roboto-light text-sm text-white transition border-0 focus:outline-none focus:border-white placeholder-blue-200 rounded bg-bama-burgundy py-1 px-2 pl-10 appearance-none leading-normal ds-input"
                            />
                        </form>
                        <div id="home-search-icon" className="absolute search-icon top-2 left-2">
                            <svg
                            className="w-4 h-4 text-white pointer-events-none"
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                            >
                                <path d="M12.9 14.32a8 8 0 1 1 1.41-1.41l5.35 5.33-1.42 1.42-5.33-5.34zM8 14A6 6 0 1 0 8 2a6 6 0 0 0 0 12z" />
                            </svg>
                        </div>
                    </div>
                </div>

                {/* Right: Login */}
                <div className="flex justify-end items-center w-1/5 space-x-3">
                    {/* If user is logged in, show username and logout button */}
                    {userAuthenticated ? (
                        <>
                            <div className="flex items-center space-x-1 bg-bama-burgundy px-2 py-1 rounded">
                                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                                </svg>
                                <span className="text-white text-sm">{username}</span>
                            </div>
                            <span className="text-white cursor-pointer text-sm" onClick={handleLogout}>Logout</span>
                        </>
                    ) : (
                        <span className="text-white cursor-pointer text-sm" onClick={() => navigate('/login')}>Login</span>
                    )}
                </div>
            </header>
        </div>
    )
}

// Export the Header component
export default Header;