// Import dependencies
import React from 'react';
import { useNavigate } from 'react-router-dom';
import Workspace from '../components/Workspace';
import DataStories from '../components/DataStories';

// Import components

// Import pages

// Login page component
const Home = () => {

    // Visible component
    return <div id="home-container" className="flex w-full">
    
        <div id="left-home" className="w-1/5 px-3 border-r border-1 border-gray">
            <div id="nav-dropdown" className="h-[47vh]">
                NAV DROPDOWN
            </div>

            <div id="footer" className="h-[47vh]">
                FOOTER
            </div>
        
        </div>

        <div id="middle-home" className="w-3/5 px-6 border-l border-r border-1 border-gray">
            <div id="workspace" className="h-[40vh]">
                <Workspace />
            </div>

            <div id="data-stories" className="h-[47vh]">
                <DataStories />
            </div>
        </div>


        <div id="right-home" className="w-1/5 px-3 border-l border1 border-gray">
            <div id="right-top" className="h-[47vh]">
                CAST LOGO
            </div>
        </div>
    </div>
}

// Export the Login component
export default Home;