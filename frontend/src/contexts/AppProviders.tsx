import type { ReactNode } from 'react'
import { AlertProvider } from '@/contexts/Alert'
import { AuthProvider } from '@/contexts/Auth'
import { ResearchQuestionsProvider } from '@/contexts/ResearchQuestions'

export const AppProviders = ({ children }: { children: ReactNode }) => {
    return (
        <AlertProvider>
            <AuthProvider>
                <ResearchQuestionsProvider>
                    { children }
                </ResearchQuestionsProvider>
            </AuthProvider>
        </AlertProvider>
    )
}