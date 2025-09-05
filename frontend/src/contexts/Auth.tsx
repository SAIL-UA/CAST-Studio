import { createContext, useContext, useState, useEffect } from "react";
import { checkAuth } from "../services/api";

// Create context instance
type AuthContextType = {
    userAuthenticated: boolean;
    setUserAuthenticated: (authenticated: boolean) => void;
    username: string | null;
    setUsername: (username: string | null) => void;
}
const AuthContext = createContext<AuthContextType | null>(null);

// Auth provider
export const AuthProvider = ({ children }: { children: React.ReactNode }) => {

    const [userAuthenticated, setUserAuthenticated ] = useState(false);
    const [username, setUsername] = useState<string | null>(null);

    // Global auth check on load
    useEffect(() => {
        // Check authentication on load
        checkAuth()
        .then((data) => {
            setUserAuthenticated(data.authenticated);
            setUsername(data.user);
        })
        .catch((error) => {
            console.error('Error checking authentication:', error);
            setUserAuthenticated(false); // Default to unauthenticated on error
            setUsername(null);
        });
    }, []);

    // Return context provider
    return (
        <AuthContext.Provider value={{ userAuthenticated, setUserAuthenticated, username, setUsername }}>
            { children }
        </AuthContext.Provider>
    )
}

// Export context hook
export const useAuth = () => {
    return useContext(AuthContext) as AuthContextType;
}