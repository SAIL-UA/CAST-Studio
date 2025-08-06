// Import dependencies
import { useNavigate } from 'react-router-dom';

// Header component
const Header = () => {

    // Navigation helper
    const navigate = useNavigate();

    // Search functionality
    const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        navigate('/construction');
    }

    // Visible component
    return (
        <header className="h-[min(6vh,6vw)] sticky top-0 bg-bama-crimson flex items-center px-6">
            {/* Left: Logo + Title */}
            <div className="flex items-center w-1/5 pl-10">
                <svg
                className="w-5 text-white"
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
                <h3 className="text-white font-bold ml-2">StoryStudio</h3>
            </div>

            {/* Center: Search Bar */}
            <div className="flex justify-center items-center w-3/5 h-full">
                <div className="relative w-full h-[55%]">
                    <form className="w-full h-full" 
                    onSubmit={(e: React.FormEvent<HTMLFormElement>) => handleSearch(e)}>
                        <input
                            type="search"
                            placeholder="Search"
                            className="w-full pl-8 pr-4 h-full rounded-md bg-[#01688D] text-white placeholder-white/60 focus:outline-none"
                        />
                    </form>
                    <div className="absolute top-2 left-2">
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
            <div className="flex justify-end w-1/5">
                <span className="text-white">Login</span>
            </div>
        </header>

    )
}

// Export the Header component
export default Header;