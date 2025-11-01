// Import dependencies
import { useNavigate } from 'react-router-dom';

// Import images
import home from '../assets/images/home.svg';

// Footer component
const Footer = () => {

    // Navigation
    const navigate = useNavigate();

    // Handle dropdown selections
    const handleDropdownSelection = () => {
        navigate(`/construction`);
    }

    // Visible component
    return (
        <div id="footer-container" className="flex flex-col justify-start items-start mx-8"><br /><br />
            <p className="font-roboto-regular text-xs">A part of NSF-funded</p>
                <h1 className="text-6xl font-roboto-bold">CAST</h1>
                <h3 className="font-roboto-regular">Coaching Data Storytelling at Scale</h3>
                <br />
                <ul className="text-sm space-y-2 font-sans">
                    <li className="cursor-pointer hover:font-roboto-semibold"
                    onClick={handleDropdownSelection}>
                        <span className="flex items-center justify-start">
                            <img src={home} alt="JupyterHub" className="w-4 h-4 mr-2" />
                            Visit CAST Home
                        </span>
                    </li>
                    <li className="cursor-pointer hover:font-roboto-semibold">
                        <span className="flex items-center justify-start">
                            <img src={home} alt="JupyterHub" className="w-4 h-4 mr-2" />
                            <a href="https://www.nsf.gov/funding/opportunities/ritel-research-innovative-technologies-enhanced-learning" target="_blank">Visit NSF RITEL Home</a>
                        </span>
                    </li>
                </ul>
        </div>
    )
}

export default Footer;