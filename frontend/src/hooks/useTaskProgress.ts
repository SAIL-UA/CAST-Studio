import { useEffect, useRef, useState, useCallback } from 'react';
import { getTaskProgress } from '../services/api';

export type TaskProgressData = {
    progress: number;
    stageName: string;
    substage: string | null;
    error: string | null;
    isComplete: boolean;
    isRunning: boolean;
};

const POLL_INTERVAL_MS = 2500;

export const useTaskProgress = (taskId: string | null): TaskProgressData => {
    const [data, setData] = useState<TaskProgressData>({
        progress: 0,
        stageName: '',
        substage: null,
        error: null,
        isComplete: false,
        isRunning: false,
    });

    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const stopPolling = useCallback(() => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
    }, []);

    useEffect(() => {
        if (!taskId) {
            stopPolling();
            setData({
                progress: 0,
                stageName: '',
                substage: null,
                error: null,
                isComplete: false,
                isRunning: false,
            });
            return;
        }

        const poll = async () => {
            try {
                const resp = await getTaskProgress(taskId);
                const { current_stage, total_stages, stage_name, substage, error } = resp;

                if (error || current_stage === -1) {
                    stopPolling();
                    setData({
                        progress: 0,
                        stageName: stage_name || 'Error',
                        substage: null,
                        error: error || 'Unknown error',
                        isComplete: false,
                        isRunning: false,
                    });
                    return;
                }

                const isComplete = current_stage >= total_stages;
                const rawProgress = total_stages > 0
                    ? Math.min(100, Math.round((current_stage / total_stages) * 100))
                    : 0;
                // Minimum 10% so even the first stage feels like progress
                const progress = isComplete ? 100 : Math.max(10, rawProgress);

                if (isComplete) {
                    stopPolling();
                }

                setData({
                    progress,
                    stageName: stage_name,
                    substage: substage || null,
                    error: null,
                    isComplete,
                    isRunning: !isComplete,
                });
            } catch {
                // Network error — keep polling, don't treat as task error
            }
        };

        // Immediate first poll
        poll();

        intervalRef.current = setInterval(poll, POLL_INTERVAL_MS);

        return () => {
            stopPolling();
        };
    }, [taskId, stopPolling]);

    return data;
};
