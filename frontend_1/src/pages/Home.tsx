// Import dependencies
import React from 'react';
import { useNavigate } from 'react-router-dom';

// Import components

// Import pages

// Login page component
const Home = () => {

    // Visible component
    return <div id="home-container" className="flex w-full">
    
        <div id="left-home" className="w-1/5">
            <div id="nav-dropdown" className="h-[47vh]">
                NAV DROPDOWN
            </div>

            <div id="footer" className="h-[47vh]">
                FOOTER
            </div>
        
        </div>

        <div id="middle-home" className="w-3/5">
            <div id="workkspace" className="h-[47vh]">
                WORKSpace
            </div>

            <div id="data-stories" className="h-[47vh]">
                DATA STORIES
            </div>
        </div>


        <div id="right-home" className="w-1/5">
            <div id="right-top" className="h-[47vh]">
                CAST LOGO
            </div>
        </div>
    </div>
}

// Export the Login component
export default Home;