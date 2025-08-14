// Import dependencies
import { NavigateFunction } from "react-router-dom";


// Check auth and redirect to login if not authenticated
const handleAuthRequired = (userAuthenticated: boolean, navigate: NavigateFunction) => {
    if (!userAuthenticated) {
        navigate('/login');
    }
}

export { handleAuthRequired };