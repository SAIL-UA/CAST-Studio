import type { ReactNode } from 'react'
import { AuthProvider } from '@/contexts/Auth'
import { ResearchQuestionsProvider } from '@/contexts/ResearchQuestions'

export const AppProviders = ({ children }: { children: ReactNode }) => {
    return (
        <AuthProvider>
            <ResearchQuestionsProvider>
                { children }
            </ResearchQuestionsProvider>
        </AuthProvider>
    )
}