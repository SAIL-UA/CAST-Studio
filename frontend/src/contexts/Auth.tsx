import { createContext, useContext, useState, useEffect } from "react";
import { checkAuth } from "../services/api";

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
        checkAuth()
        .then((data) => {
            setUserAuthenticated(data.authenticated);
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