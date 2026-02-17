import { createContext, useContext, useState, useEffect } from "react";
import { checkAuth } from "../services/api";

// Create context instance
type AuthContextType = {
    userAuthenticated: boolean;
    setUserAuthenticated: (authenticated: boolean) => void;
    username: string | null;
    setUsername: (username: string | null) => void;
    authLoading: boolean;
}
const AuthContext = createContext<AuthContextType | null>(null);

// Auth provider
export const AuthProvider = ({ children }: { children: React.ReactNode }) => {

    const [userAuthenticated, setUserAuthenticated ] = useState(false);
    const [username, setUsername] = useState<string | null>(null);
    const [authLoading, setAuthLoading] = useState(true);

    // Global auth check on load
    useEffect(() => {
        // Check authentication on load
        const checkAuthWithRetry = async () => {
            setAuthLoading(true);
            try {
                const data = await checkAuth();
                setUserAuthenticated(data.authenticated);
                setUsername(data.user);
            } catch (error) {
                console.error('Initial auth check failed:', error);

                // If we have a refresh token, wait briefly and retry
                // This gives the axios interceptor time to refresh the token
                const refreshToken = localStorage.getItem('refresh');
                if (refreshToken) {
                    console.log('Refresh token exists, retrying auth check...');
                    // Wait 1 second for token refresh to complete
                    await new Promise(resolve => setTimeout(resolve, 1000));

                    try {
                        const retryData = await checkAuth();
                        setUserAuthenticated(retryData.authenticated);
                        setUsername(retryData.user);
                        console.log('Auth check succeeded after retry');
                        setAuthLoading(false);
                        return;
                    } catch (retryError) {
                        console.error('Retry auth check also failed:', retryError);
                    }
                }

                // No refresh token or retry failed - mark as unauthenticated
                setUserAuthenticated(false);
                setUsername(null);
            } finally {
                setAuthLoading(false);
            }
        };

        checkAuthWithRetry();
    }, []);

    // Return context provider
    return (
        <AuthContext.Provider value={{ userAuthenticated, setUserAuthenticated, username, setUsername, authLoading }}>
            { children }
        </AuthContext.Provider>
    )
}

// Export context hook
export const useAuth = () => {
    return useContext(AuthContext) as AuthContextType;
}