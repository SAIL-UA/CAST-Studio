// Import dependencies



// Check auth and redirect to login if not authenticated
const handleAuthRequired = (userAuthenticated, navigate) => {
    if (!userAuthenticated) {
        navigate('/login');
    }
}

export { handleAuthRequired };