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
        <div id="footer-container" className="flex flex-col justify-start items-start mx-8">
            <p className="font-roboto-regular text-xs">A part of a NSF funded</p>
                <h1 className="text-6xl font-roboto-bold">CAST</h1>
                <h3 className="font-roboto-semibold">Coaching Data Storytelling at Scale</h3>
                <ul>
                    <li className="cursor-pointer hover:font-roboto-semibold"
                    onClick={handleDropdownSelection}>
                        <span className="flex items-center justify-start">
                            <img src={home} alt="JupyterHub" className="w-4 h-4 mr-2" />
                            Visit JupyterHub
                        </span>
                    </li>
                    <li className="cursor-pointer hover:font-roboto-semibold"
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

export default Footer;