// Import dependencies
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

// Import images
import home from '../assets/images/home.svg';
import categories from '../assets/images/categories.svg';
import browse from '../assets/images/browse.svg';


// Nav dropdown component
const NavDropdown = () => {

    // Navigation
    const navigate = useNavigate();

    // State
    const [tutorialsOpen, setTutorialsOpen] = useState(false);

    // Dropdown toggle
    const toggleDropdown = () => {
        setTutorialsOpen(!tutorialsOpen);
    }

    // Handle dropdown selections
    const handleDropdownSelection = () => {
        navigate(`/construction`);
    }

    // Visible component
    return (
        <div id="nav-dropdown-container" className="flex flex-col mt-10 mx-8 font-roboto-regular text-indigo-darkest">
            <ul className="space-y-4 text-sm font-sans">
                <li className="cursor-pointer hover:text-indigo"
                onClick={() => navigate(`/`)}>
                    <span className="flex items-center justify-start">
                        <img src={home} alt="Home" className="w-4 h-4 mr-2" />
                        Home
                    </span>
                </li>

                <li
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
                        <li className="cursor-pointer hover:text-indigo-dark"
                        onClick={handleDropdownSelection}>
                        Gather Data Source
                        </li>
                        <li className="cursor-pointer hover:text-indigo-dark"
                        onClick={handleDropdownSelection}>
                        Create Data Insights
                        </li>
                        <li className="cursor-pointer hover:text-indigo-dark"
                        onClick={handleDropdownSelection}>
                        Create Data
                        </li>
                        <li className="cursor-pointer hover:text-indigo-dark"
                        onClick={handleDropdownSelection}>
                        Generate Narrative Structure
                        </li>
                        <li className="cursor-pointer hover:text-indigo-dark"
                        onClick={handleDropdownSelection}>Generate Data Story</li>
                    </ul>

                <li className="cursor-pointer hover:text-indigo"
                onClick={handleDropdownSelection}>
                    <span className="flex items-center justify-start">
                        <img src={browse} alt="Browse" className="w-4 h-4 mr-2" />
                        Browse Narrative Patterns
                    </span>
                </li>
                <li className="cursor-pointer hover:text-indigo"
                onClick={handleDropdownSelection}>
                    <span className="flex items-center justify-start">
                        <img src={home} alt="JupyterHub" className="w-4 h-4 mr-2" />
                        Visit JupyterHub
                    </span>
                </li>
            </ul>
        </div>
    )
}

export default NavDropdown;