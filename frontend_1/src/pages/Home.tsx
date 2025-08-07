// Import dependencies
import React from 'react';
import { useNavigate } from 'react-router-dom';

// Import components
import NavDropdown from '../components/NavDropdown';
import Workspace from '../components/Workspace';
import DataStories from '../components/DataStories';
import RecommendedNarratives from '../components/RecommendedNarratives';
import Footer from '../components/Footer';

// Import images
import avatar from '../assets/images/avatar.svg';

// Login page component
const Home = () => {

    // Visible component
    return <div id="home-container" className="flex w-full">
    
        <div id="left-home" className="w-1/5 px-3 border-r border-1 border-gray">
            <div id="nav-dropdown" className="h-[46vh]">
                <NavDropdown />
            </div>

            <div id="footer" className="h-[46vh] flex flex-col justify-start items-start">
                <Footer />

            </div>
        
        </div>

        <div id="middle-home" className="w-3/5 px-6 border-l border-r border-1 border-gray">
            <div id="workspace" className="h-[46vh] basis-1/2">
                <Workspace />
            </div>

            <div id="data-stories" className="h-[46vh] basis-1/2">
                <DataStories />
            </div>
        </div>


        <div id="right-home" className="w-1/5 px-3 border-l border1 border-gray">
            <div id="right-top" className="h-[46vh]">
                <div id="right-top-top" className="flex w-full h-1/2">
                    <img src={avatar} alt="Avatar" className="w-1/3 p-4 m-r-1" />
                    <div id="right-top-top-text" className="flex flex-col justify-center w-2/3 m-l-1">
                        <h3 className="text-2xl">Caleb Erickson</h3>
                        <p className="text-sm">Joined since summer 2025</p>
                    </div>
                </div>

                <div id="right-top-bottom" className="flex w-full h-1/2">
                    <RecommendedNarratives />
                </div>
            </div>
        </div>
    </div>
}

// Export the Login component
export default Home;