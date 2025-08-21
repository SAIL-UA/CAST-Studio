// Import dependencies
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';

// Import context
import { useAuth } from '../contexts/Auth';

// Import components
import Header from '../components/Header';
import NavDropdown from '../components/NavDropdown';
import StoryBoard from '../components/StoryBoard';
import DataStories from '../components/DataStories';
import Trash from '../components/Recycle';
import RecommendedNarratives from '../components/RecommendedNarratives';
import Footer from '../components/Footer';

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
    const [storyboardSelected, setStoryboardSelected] = useState(true);
    const [trashSelected, setTrashSelected] = useState(false);

    // Check authentication
    handleAuthRequired(userAuthenticated, navigate);

    const handleStoryboard = () => {
        setStoryboardSelected(true)
        setTrashSelected(false)
    }

    const handleTrash = () => {
        setStoryboardSelected(false)
        setTrashSelected(true)
    }

    // Visible component
    return (
        <>
            <Header />
            <div id="home-container" className="flex w-full font-roboto-light">
        
                {/* Left Home */}
                <div id="left-home" className="w-1/5 px-3 border-r border-1 border-grey-light">
                    <div id="nav-dropdown" className="h-[46vh]">
                        <NavDropdown />
                    </div>

                    <div id="footer" className="h-[46vh] flex flex-col justify-start items-start">
                        <Footer />

                    </div>
                
                </div>

                {/* Middle Home */}
                <div id="middle-home" className="w-3/5 px-3 flex flex-col">
                    <div id="workspace" className="h-[65vh] pl-4 pr-4 flex flex-col justify-center">
                        <div id="workspace-header" className="flex mt-6 w-full">
                            <div id="workspace-header-left" className="flex w-full h-full items-end justify-start">
                                <br /><br /><h3 className="text-2xl">Workspace</h3>
                            </div>
                            <div id="workspace-header-right" className="flex w-1/2 h-full items-end justify-end gap-2 text-sm">
                            <button id="narrative-button"
                                className={`underline-animate ${storyboardSelected ? 'active' : ''} mx-3`}
                                onClick={handleStoryboard}
                                >
                                Storyboard
                                </button>

                                <button id="story-button"
                                className={`underline-animate ${trashSelected ? 'active' : ''} mx-3`}
                                onClick={handleTrash}>
                                Recycle Bin
                                </button>
                            </div>
                        </div>
                        {storyboardSelected ? <StoryBoard /> : <Trash />}
                    </div><br />

                    <div id="data-stories" className="h-[75vh] pl-4 pr-4 pb-10 flex flex-col justify-center">
                        <DataStories />
                    </div>
                </div>

                {/* Right Home */}
                <div id="right-home" className="w-1/5 px-3 bg-grey-lighter-2">
                    <div id="right-top" className="h-1/4">
                        <div id="right-top-top" className="flex w-full h-1/2">
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
                                <p className="text-lg">Username.</p>
                                <p className="text-sm">Since 2025</p>
                            </div>
                        </div>

                        <div id="right-top-bottom" className="flex w-full h-1/2">
                            <RecommendedNarratives />
                        </div>
                    </div>
                </div>
            </div>
        </>
    )
}

// Export the Login component
export default Home;