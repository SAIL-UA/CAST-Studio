import type { ReactNode } from 'react'
import { AuthProvider } from './Auth'
import { ResearchQuestionsProvider } from './ResearchQuestions'

export const AppProviders = ({ children }: { children: ReactNode }) => {
    return (
        <AuthProvider>
            <ResearchQuestionsProvider>
                { children }
            </ResearchQuestionsProvider>
        </AuthProvider>
    )
}