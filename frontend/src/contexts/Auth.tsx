import { createContext, useContext, useState, useEffect } from "react";
import { checkAuth, guestCleanup } from "@/services/api";

// Create context instance
type AuthContextType = {
    userAuthenticated: boolean;
    setUserAuthenticated: (authenticated: boolean) => void;
    username: string | null;
    setUsername: (username: string | null) => void;
    userId: string | null;
    setUserId: (userId: string | null) => void;
    isInstructor: boolean;
    setIsInstructor: (isInstructor: boolean) => void;
    authLoading: boolean;
}
const AuthContext = createContext<AuthContextType | null>(null);

// Auth provider
export const AuthProvider = ({ children }: { children: React.ReactNode }) => {

    const [userAuthenticated, setUserAuthenticated ] = useState(false);
    const [username, setUsername] = useState<string | null>(null);
    const [userId, setUserId] = useState<string | null>(null);
    const [isInstructor, setIsInstructor] = useState(false);
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
                setUserId(data.user_id || null);
                setIsInstructor(data.is_instructor || false);
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
                        setUserId(retryData.user_id || null);
                        setIsInstructor(retryData.is_instructor || false);
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
                setUserId(null);
                setIsInstructor(false);
            } finally {
                setAuthLoading(false);
            }
        };

        checkAuthWithRetry();
    }, []);

    // Guest cleanup on tab close: if the current user is a guest
    // (username starts with 'guest-'), fire a sendBeacon to delete them
    // and their seeded data when the tab is unloaded.
    useEffect(() => {
        if (!username || !username.startsWith('guest-')) return;
        const handler = () => guestCleanup();
        window.addEventListener('pagehide', handler);
        return () => window.removeEventListener('pagehide', handler);
    }, [username]);

    // Return context provider
    return (
        <AuthContext.Provider value={{ userAuthenticated, setUserAuthenticated, username, setUsername, userId, setUserId, isInstructor, setIsInstructor, authLoading }}>
            { children }
        </AuthContext.Provider>
    )
}

// Export context hook
export const useAuth = () => {
    return useContext(AuthContext) as AuthContextType;
}
