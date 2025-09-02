import axios from "axios";
import { createContext, useContext, useState, useEffect } from "react";

// Create context instance
type AuthContextType = {
    userAuthenticated: boolean;
    setUserAuthenticated: (authenticated: boolean) => void;
}
const AuthContext = createContext<AuthContextType | null>(null);

// Auth provider
export const AuthProvider = ({ children }: { children: React.ReactNode }) => {

    const [userAuthenticated, setUserAuthenticated ] = useState(false);

    // Global auth check on load
    useEffect(() => {
        // Check authentication on load
        axios
        .get('/check_auth', { withCredentials: true })
        .then((response) => {
            setUserAuthenticated(response.data.authenticated);
        })
        .catch((error) => {
            console.error('Error checking authentication:', error);
            setUserAuthenticated(false); // Default to unauthenticated on error
        });
    }, []);

    // Return context provider
    return (
        <AuthContext.Provider value={{ userAuthenticated, setUserAuthenticated }}>
            { children }
        </AuthContext.Provider>
    )
}

// Export context hook
export const useAuth = () => {
    return useContext(AuthContext) as AuthContextType;
}