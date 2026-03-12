// Import dependencies
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

// Import contexts
import { useAuth } from '../contexts/Auth';
import { logout } from '../services/api';

// Define props interface
type HeaderProps = {
    onMenuOpen?: () => void;
    floating?: boolean;
    menuOpen?: boolean;
    subtitle?: string;
    onRecycleBinOpen?: () => void;
};

// Header component
const Header = ({ onMenuOpen, floating = false, menuOpen = false, subtitle, onRecycleBinOpen }: HeaderProps) => {

    // Helpers
    const navigate = useNavigate();

    // Contexts
    const { userAuthenticated, setUserAuthenticated, username, setUsername } = useAuth();

    // Profile dropdown state
    const [profileOpen, setProfileOpen] = useState(false);

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

    // Floating mode: two separate overlay pills
    if (floating) {
        return (
            <>
                {/* Left pill: Menu + Logo + Title */}
                <div className={`fixed top-3 left-3 z-[499] flex items-center rounded-lg pl-3 pr-4 py-2 transition-colors duration-200 ${
                    menuOpen
                        ? 'bg-grey-lighter-2 shadow-none'
                        : 'bg-bama-crimson shadow-lg'
                }`}>
                    {onMenuOpen && (
                        <button
                            log-id="menu-button"
                            className={`flex items-center justify-center w-8 h-8 rounded transition-colors duration-150 mr-2 ${
                                menuOpen
                                    ? 'text-grey-darkest hover:bg-grey-lighter'
                                    : 'text-white hover:bg-bama-burgundy'
                            }`}
                            onClick={onMenuOpen}
                            title="Menu"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                            </svg>
                        </button>
                    )}
                    <div onClick={() => navigate('/')} className="flex items-center cursor-pointer">
                        <svg
                            className={`w-5 transition-colors duration-200 ${menuOpen ? 'text-grey-darkest' : 'text-white'}`}
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="currentColor"
                        >
                            <path d="M12 .75a8.25 8.25 0 0 0-4.135 15.39c.686.398 1.115 1.008 1.134 1.623a.75.75 0 0 0 .577.706c.352.083.71.148 1.074.195.323.041.6-.218.6-.544v-4.661a6.714 6.714 0 0 1-.937-.171.75.75 0 1 1 .374-1.453 5.261 5.261 0 0 0 2.626 0 .75.75 0 1 1 .374 1.452 6.712 6.712 0 0 1-.937.172v4.66c0 .327.277.586.6.545.364-.047.722-.112 1.074-.195a.75.75 0 0 0 .577-.706c.02-.615.448-1.225 1.134-1.623A8.25 8.25 0 0 0 12 .75Z" />
                            <path fillRule="evenodd"
                                d="M9.013 19.9a.75.75 0 0 1 .877-.597 11.319 11.319 0 0 0 4.22 0 .75.75 0 1 1 .28 1.473 12.819 12.819 0 0 1-4.78 0 .75.75 0 0 1-.597-.876ZM9.754 22.344a.75.75 0 0 1 .824-.668 13.682 13.682 0 0 0 2.844 0 .75.75 0 1 1 .156 1.492 15.156 15.156 0 0 1-3.156 0 .75.75 0 0 1-.668-.824Z"
                                clipRule="evenodd"
                            />
                        </svg>
                        <p className={`font-roboto-semibold ml-2 text-lg whitespace-nowrap transition-colors duration-200 ${
                            menuOpen ? 'text-grey-darkest' : 'text-white'
                        }`}>StoryStudio{subtitle && <span className="font-roboto-light font-normal ml-1.5">{subtitle}</span>}</p>
                    </div>
                </div>

                {/* Right area: Recycle Bin + Profile pill */}
                <div className="fixed top-3 right-3 z-[499] flex items-center gap-2">
                    {onRecycleBinOpen && (
                        <button
                            log-id="view-recycle-bin-button"
                            className="flex items-center gap-1 px-3 py-2 text-xs font-medium text-grey-darker bg-white border border-grey-light rounded-lg shadow-lg hover:bg-grey-lightest transition-colors duration-150"
                            onClick={onRecycleBinOpen}
                        >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            View Recycle Bin
                        </button>
                    )}
                    <div
                        className="relative"
                        onMouseEnter={() => setProfileOpen(true)}
                        onMouseLeave={() => setProfileOpen(false)}
                    >
                        <div className="flex items-center bg-bama-crimson rounded-lg px-3 py-2 shadow-lg cursor-pointer">
                            {userAuthenticated ? (
                                <div className="flex items-center space-x-1 bg-bama-burgundy px-2 py-1 rounded">
                                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                                    </svg>
                                    <span className="text-white text-sm">{username}</span>
                                </div>
                            ) : (
                                <span className="text-white cursor-pointer text-sm" onClick={() => navigate('/login')}>Login</span>
                            )}
                        </div>
                        {userAuthenticated && profileOpen && (
                            <div className="absolute top-full right-0 pt-1 z-[500]">
                                <div className="bg-white rounded-lg shadow-lg py-1 min-w-[120px]">
                                    <button
                                        log-id="logout-button"
                                        onClick={handleLogout}
                                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors duration-150 rounded-lg"
                                    >
                                        Logout
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </>
        );
    }

    // Standard full-width bar mode
    return (
        <div id="header-container" className='fixed w-screen z-10 bg-bama-crimson text-center p-4 px-2 flex items-center z-[499]'>
            <header className="h-full w-full sticky top-0 bg-bama-crimson flex items-center px-2">
                {/* Left: Menu + Logo + Title */}
                <div className="w-1/5">
                    <div className="flex items-center">
                    {onMenuOpen && (
                        <button
                            log-id="menu-button"
                            className="flex items-center justify-center w-8 h-8 text-white hover:bg-bama-burgundy rounded transition-colors duration-150 mr-2"
                            onClick={onMenuOpen}
                            title="Menu"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                            </svg>
                        </button>
                    )}
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
                </div>

                {/* Center: Search Bar */}
                <div className="flex justify-center items-center w-3/5 h-full">
                    <div className="relative w-full h-[55%]">
                    </div>
                </div>

                {/* Right: Login */}
                <div className="flex justify-end items-center w-1/5">
                    <div
                        className="relative"
                        onMouseEnter={() => setProfileOpen(true)}
                        onMouseLeave={() => setProfileOpen(false)}
                    >
                        <div className="flex items-center cursor-pointer">
                            {userAuthenticated ? (
                                <div className="flex items-center space-x-1 bg-bama-burgundy px-2 py-1 rounded">
                                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                                    </svg>
                                    <span className="text-white text-sm">{username}</span>
                                </div>
                            ) : (
                                <span className="text-white cursor-pointer text-sm" onClick={() => navigate('/login')}>Login</span>
                            )}
                        </div>
                        {userAuthenticated && profileOpen && (
                            <div className="absolute top-full right-0 pt-1 z-[500]">
                                <div className="bg-white rounded-lg shadow-lg py-1 min-w-[120px]">
                                    <button
                                        log-id="logout-button"
                                        onClick={handleLogout}
                                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors duration-150 rounded-lg"
                                    >
                                        Logout
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </header>
        </div>
    )
}

// Export the Header component
export default Header;
