import { useEffect, useState } from 'react';
import { getEffectiveFeatureFlags } from '../services/api';

export type FeatureFlagsData = {
    annotateWithAI: boolean;
    selectWithAI: boolean;
    aiFeedback: boolean;
    study: { id: string; name: string; is_active: boolean } | null;
    loading: boolean;
};

export const useFeatureFlags = (): FeatureFlagsData => {
    const [flags, setFlags] = useState<FeatureFlagsData>({
        annotateWithAI: true,
        selectWithAI: true,
        aiFeedback: true,
        study: null,
        loading: true,
    });

    useEffect(() => {
        const fetchFlags = async () => {
            try {
                const data = await getEffectiveFeatureFlags();
                setFlags({
                    annotateWithAI: data.annotate_with_ai ?? true,
                    selectWithAI: data.select_with_ai ?? true,
                    aiFeedback: data.ai_feedback ?? true,
                    study: data.study ?? null,
                    loading: false,
                });
            } catch {
                // Fall open on error so we don't accidentally hide features
                // from users due to transient network failures. Server-side
                // gating (Phase 4) is the authoritative enforcer.
                setFlags({
                    annotateWithAI: true,
                    selectWithAI: true,
                    aiFeedback: true,
                    study: null,
                    loading: false,
                });
            }
        };

        fetchFlags();
    }, []);

    return flags;
};
