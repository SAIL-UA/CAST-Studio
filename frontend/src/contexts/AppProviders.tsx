import { AuthProvider } from './Auth'
import { ResearchQuestionsProvider } from './ResearchQuestions'

export const AppProviders = ({ children }: { children: React.ReactNode }) => {
    return (
        <AuthProvider>
            <ResearchQuestionsProvider>
                { children }
            </ResearchQuestionsProvider>
        </AuthProvider>
    )
}