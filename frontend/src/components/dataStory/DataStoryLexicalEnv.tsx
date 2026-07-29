import { createContext, useContext, type ReactNode } from 'react';

export type DataStoryLexicalEnv = {
    getCaption: (filename: string) => string;
};

const DataStoryLexicalEnvContext = createContext<DataStoryLexicalEnv | null>(null);

export function DataStoryLexicalEnvProvider({
    children,
    getCaption,
}: {
    children: ReactNode;
    getCaption: (filename: string) => string;
}) {
    return (
        <DataStoryLexicalEnvContext.Provider value={{ getCaption }}>{children}</DataStoryLexicalEnvContext.Provider>
    );
}

export function useDataStoryLexicalEnv(): DataStoryLexicalEnv {
    const v = useContext(DataStoryLexicalEnvContext);
    if (!v) {
        throw new Error('useDataStoryLexicalEnv must be used within DataStoryLexicalEnvProvider');
    }
    return v;
}
