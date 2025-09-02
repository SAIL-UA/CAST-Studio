import { AuthProvider } from './Auth'

export const AppProviders = ({ children }: { children: React.ReactNode }) => {
    return (
        <AuthProvider>
            { children }
        </AuthProvider>
    )
}