// Import dependencies
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';

// Import context
import { useAuth } from '../contexts/Auth';

// Import components
import Header from '../components/Header';
import NavDropdown from '../components/NavDropdown';
import DataStories from '../components/DataStories';
import RecommendedNarratives from '../components/RecommendedNarratives';
import Footer from '../components/Footer';
import NarrativePatterns from '../components/NarrativePatterns'
import Workspace from '../components/Workspace'

// Import images

// Import utils
import { handleAuthRequired } from '../utils/utils';

// Login page component
const Home = () => {
    // Helpers
    const navigate = useNavigate();

    // Contexts
    const { userAuthenticated } = useAuth();

    // State
    const [screenLarge, setScreenLarge] = useState(true);
    const [rightOpen, setRightOpen] = useState(false);
    const [leftOpen, setLeftOpen] = useState(false);
    const [centerNarrativePatternsOpen, setCenterNarrativePatternsOpen] = useState(false);
    const [rightNarrativePatternsOpen, setRightNarrativePatternsOpen] = useState(false);
    const [selectedPattern, setSelectedPattern] = useState('');

    // Check authentication
    handleAuthRequired(userAuthenticated, navigate);

    // Check screen size
    useEffect(() => {
        const width = window.matchMedia('(min-width: 1200px)'); // Make sure px matches tailwind config
        const handler = (e: MediaQueryListEvent) => {
            setScreenLarge(e.matches);
        }
        setScreenLarge(width.matches); // Set initial state
        width.addEventListener('change', handler); // Event listener for all screen size changes
        return () => width.removeEventListener('change', handler); // Cleanup
    }, []);

    // Collapse sidebars when screen size changes
    useEffect(() => {
        if (screenLarge) {
            setRightOpen(true);
            setLeftOpen(true);
        } else {
            setRightOpen(false);
            setLeftOpen(false);
        }
    }, [screenLarge]);

    // Visible component
    return (
        <>
            <Header />
            <div id="home-container" className="flex w-full font-roboto-light">
        
                {/* Left Home */}
                <div id="left-home" className="w-1/5 px-3 max-xl:hidden">
                    <div id="nav-dropdown" className="h-[46vh] ml-2">
                        <NavDropdown setCenterNarrativePatternsOpen={setCenterNarrativePatternsOpen} />
                    </div>

                    <div id="footer" className="h-[46vh] flex flex-col justify-start items-start">
                        <Footer />

                    </div>
                
                </div>

                {/* Middle Home */}
                <div id="middle-home" className="w-3/5 max-xl:w-full px-4 flex flex-col border-l border-1 border-grey-light">
                    
                    {centerNarrativePatternsOpen ? (
                        <div id="narrative-patterns" className="min-h-[75vh] flex flex-col mt-6 pr-4 pl-4">
                            <NarrativePatterns setSelectedPattern={setSelectedPattern} setRightNarrativePatternsOpen={setRightNarrativePatternsOpen} center={true} />
                        </div>
                    ) : (
                        <>
                            <div className="h-[75vh] mt-10 mb-6 pr-4 pl-4">
                                <Workspace setRightNarrativePatternsOpen={setRightNarrativePatternsOpen} selectedPattern={selectedPattern} />
                            </div>
                            <div className="h-[75vh] mt-6 mb-6 pl-4 pr-4">
                                <DataStories />
                            </div>
                        </>
                    )}
                </div>

                {/* Right Home */}
                {screenLarge || rightOpen ? (
                    <>
                        {/* Background for sidebar open on small screens */}
                        {!screenLarge && (
                            <div id="right-sidebar-background" className="fixed top-0 right-0 h-screen w-screen bg-indigo-darkest opacity-50 z-10"></div>
                        )}
                        
                        {/* Right home */}
                        <div id="right-home" className={`${screenLarge ? 'w-1/5' : 'w-1/2'} px-3 bg-grey-lighter-2 z-20`}>
                            {!screenLarge && (
                            <div id="right-home-collapsed" className="w-[5%] bg-grey-lighter-2 items-start">
                                {/* Right Open */}
                                {rightOpen && (
                                    <button 
                                        id="toggle-right-home"
                                        className="w-full pt-2"
                                        onClick={() => setRightOpen(false)}
                                    >
                                        <svg className="fill-current h-4 w-4 transition-transform duration-300 ease-in rotate-[-90deg]"
                                        xmlns="http://www.w3.org/2000/svg"
                                        viewBox="0 0 20 20">
                                            <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"></path>
                                        </svg>
                                    </button>
                                )}
                            </div>
                            )}
                            {/* Right top */}
                            <div id="right-top" className="min-h-[46vh] mt-8">
                                <div id="right-top-top" className="flex w-full h-1/4">
                                    <div className="flex w-1/3 justify-center items-center">
                                        <svg
                                            width="60"
                                            height="60"
                                            viewBox="0 0 60 60"
                                            xmlns="http://www.w3.org/2000/svg"
                                        >
                                            <g stroke="none" strokeWidth="1" fill="none" fillRule="evenodd">
                                                <g transform="translate(-1178, -87)">
                                                    <g transform="translate(1159, 0)">
                                                        <g transform="translate(0, 87)">
                                                            <g transform="translate(19, 0)">
                                                                <circle id="small-circle" fill="#05648d" cx="30" cy="30" r="30" />
                                                                    <path
                                                                    id="moon"
                                                                    d="M30.5,49.7304688 C40.7172679,49.7304688 30.5,43.266096 30.5,33.0488281 C30.5,22.8315603 40.7172679,12 30.5,12 C20.2827321,12 11.0390625,20.6479665 11.0390625,30.8652344 C11.0390625,41.0825022 20.2827321,49.7304688 30.5,49.7304688 Z"
                                                                    fill="#fff"
                                                                    style={{ transformOrigin: "center center", transform: "rotate(1turn)" }}
                                                                    />
                                                                <circle id="big-circle" fill="#222" cx="31" cy="31" r="11" />
                                                            </g>
                                                        </g>
                                                    </g>
                                                </g>
                                            </g>  
                                        </svg>
                                    </div>
                                    <div id="right-top-top-text" className="flex flex-col justify-center w-2/3 m-l-1">
                                        <h3 className="text-lg">Username.</h3>
                                        <p className="text-xs">Since 2025</p>
                                    </div>
                                </div>

                                {/* Right bottom */}
                                <div id="right-top-bottom" className="flex w-full min-h-1/2 mt-4">
                                    {rightNarrativePatternsOpen ? (
                                        <NarrativePatterns setSelectedPattern={setSelectedPattern} setRightNarrativePatternsOpen={setRightNarrativePatternsOpen} center={false} />
                                    ) : (
                                        <RecommendedNarratives />
                                    )}
                                </div>
                            </div>
                        </div>
                        </>
                        ) : (
                        <>
                        <div id="right-home-collapsed" className="w-[5%] bg-grey-lighter-2 items-start">
                            {!rightOpen && (
                                <button 
                                    id="toggle-right-home"
                                    className="w-full pt-2 flex flex-col"
                                    onClick={() => setRightOpen(true)}
                                >
                                    <svg className="fill-current h-4 w-4 transition-transform duration-300 ease-in rotate-90"
                                    xmlns="http://www.w3.org/2000/svg"
                                    viewBox="0 0 20 20">
                                        <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"></path>
                                    </svg>
                                </button>
                            )}
                        </div>
                    </>
                    )
                }
            </div>
        </>
    )
}

// Export the Login component
export default Home;