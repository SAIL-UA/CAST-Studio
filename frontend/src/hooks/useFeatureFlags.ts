import { useEffect, useState } from 'react';
import { getFeatureFlags } from '../services/api';

export type FeatureFlagsData = {
    annotateWithAI: boolean;
    selectWithAI: boolean;
    loading: boolean;
};

export const useFeatureFlags = (): FeatureFlagsData => {
    const [flags, setFlags] = useState<FeatureFlagsData>({
        annotateWithAI: true,
        selectWithAI: true,
        loading: true,
    });

    useEffect(() => {
        const fetchFlags = async () => {
            try {
                const data = await getFeatureFlags();
                setFlags({
                    annotateWithAI: data.annotate_with_ai ?? true,
                    selectWithAI: data.select_with_ai ?? true,
                    loading: false,
                });
            } catch {
                setFlags({
                    annotateWithAI: true,
                    selectWithAI: true,
                    loading: false,
                });
            }
        };

        fetchFlags();
    }, []);

    return flags;
};
