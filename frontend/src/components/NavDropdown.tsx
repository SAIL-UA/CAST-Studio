// Import dependencies
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { logAction } from '../utils/userActionLogger';

// Import images
import home from '../assets/images/home.svg';
import categories from '../assets/images/categories.svg';
import browse from '../assets/images/browse.svg';

// Define props interface
type NavDropdownProps = {
    setCenterNarrativePatternsOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

// Nav dropdown component
const NavDropdown = ({ setCenterNarrativePatternsOpen }: NavDropdownProps) => {

    // Navigation
    const navigate = useNavigate();

    // State
    const [tutorialsOpen, setTutorialsOpen] = useState(false);

    // Dropdown toggle
    const toggleDropdown = (e: React.MouseEvent) => {
        logAction(e);
        setTutorialsOpen(!tutorialsOpen);
    }

    // Handle dropdown selections
    const handleDropdownSelection = (e: React.MouseEvent) => {
        logAction(e);
        navigate(`/construction`);
    }

    // Visible component
    return (
        <div id="nav-dropdown-container" className="flex flex-col mt-10 mx-8 font-roboto-regular text-indigo-darkest">
            <ul className="space-y-4 text-sm font-sans">
                <li log-id="nav-dropdown-home-button" 
                className="cursor-pointer hover:text-indigo"
                onClick={(e) => {
                    logAction(e);
                    setCenterNarrativePatternsOpen(false);
                    navigate(`/`);
                }}>
                    <span className="flex items-center justify-start">
                        <img src={home} alt="Home" className="w-4 h-4 mr-2" />
                        Home
                    </span>
                </li>

                <li log-id="nav-dropdown-tutorials-button"
                className="cursor-pointer flex justify-between items-center hover:text-indigo"
                onClick={toggleDropdown}
                >
                <span className="flex items-center justify-start">
                    <img src={categories} alt="Categories" className="w-4 h-4 mr-2" />
                    Browse Tutorials
                </span>
                <span className={`flex items-center justify-end transition-transform duration-300 ease-in ${tutorialsOpen ? 'rotate-180' : 'rotate-0'}`}> 
                    <svg className="fill-current h-4 w-4"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20">
                        <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"></path>
                    </svg>
                </span>
                </li>

                    <ul
                    className={` ml-4 pl-4 border-l border-grey space-y-1
                        dropdown-open text-grey-dark
                        ${tutorialsOpen ? 'dropdown-open-active' : 'hidden'}
                    `}
                    >
                        <li log-id="nav-dropdown-tutorial-gather-data-source"
                        className="cursor-pointer hover:text-indigo-dark"
                        onClick={(e) => {
                            logAction(e);
                            setCenterNarrativePatternsOpen(false);
                            navigate(`/Tutorials`);
                        }}>
                        Gather Data Visualizations
                        </li>
                        <li log-id="nav-dropdown-tutorial-create-data-insights"
                        className="cursor-pointer hover:text-indigo-dark"
                        onClick={handleDropdownSelection}>
                        Create Data Insights
                        </li>
                        <li log-id="nav-dropdown-tutorial-generate-narrative-structure"
                        className="cursor-pointer hover:text-indigo-dark"
                        onClick={handleDropdownSelection}>
                        Generate Narrative Structure
                        </li>
                        <li log-id="nav-dropdown-tutorial-generate-data-story"
                        className="cursor-pointer hover:text-indigo-dark"
                        onClick={handleDropdownSelection}>Generate Data Story</li>
                    </ul>

                <li log-id="nav-dropdown-browse-narrative-patterns-button"
                className="cursor-pointer hover:text-indigo"
                onClick={(e) => {
                    setCenterNarrativePatternsOpen(true);
                    logAction(e);

                }}>
                    <span className="flex items-center justify-start">
                        <img src={browse} alt="Browse" className="w-4 h-4 mr-2" />
                        Browse Narrative Structures
                    </span>
                </li>
                <li log-id="nav-dropdown-jupyterhub-button" className="cursor-pointer hover:text-indigo"
                onClick={handleDropdownSelection}>
                    <span className="flex items-center justify-start">
                        <img src={home} alt="JupyterHub" className="w-4 h-4 mr-2" />
                        Return to JupyterHub
                    </span>
                </li>
            </ul>
        </div>
    )
}

export default NavDropdown;