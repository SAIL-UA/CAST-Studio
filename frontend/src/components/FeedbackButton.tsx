// Import dependencies
import { useState } from 'react';
import { requestFeedback, requestFeedbackStatus } from '../services/api';
import { logAction, captureActionContext } from '../utils/userActionLogger';
import { useTaskProgress } from '../hooks/useTaskProgress';
import ProgressButton from './ProgressButton';

type FeedbackItem = { title: string; text: string; section?: string };

const FeedbackButton = () => {
    const [taskId, setTaskId] = useState<string | null>(null);
    const [feedbackLoading, setFeedbackLoading] = useState(false);
    const { progress, stageName, error } = useTaskProgress(taskId);

    // Handle error from progress tracking
    if (error && feedbackLoading) {
        alert(`Feedback generation failed during: ${stageName}\n\n${error}`);
        setFeedbackLoading(false);
        setTaskId(null);
    }

    const handleFeedback = async (e: React.MouseEvent) => {
        const ctx = captureActionContext(e);
        setFeedbackLoading(true);

        try {
            // Start background task
            const startResp = await requestFeedback({});
            const celeryTaskId: string = startResp?.task_id;
            if (!celeryTaskId) {
                setFeedbackLoading(false);
                return;
            }

            // Start progress tracking
            setTaskId(celeryTaskId);

            // Poll until complete
            const start = Date.now();
            const timeoutMs = 60_000;
            const intervalMs = 1500;

            const poll = async (): Promise<FeedbackItem[] | null> => {
                const { status, data } = await requestFeedbackStatus(celeryTaskId);
                if (status === 200 && Array.isArray(data)) {
                    return data as FeedbackItem[];
                }
                return null;
            };

            let items: FeedbackItem[] | null = null;
            while (Date.now() - start < timeoutMs) {
                // eslint-disable-next-line no-await-in-loop
                const res = await poll();
                if (res && res.length > 0) {
                    items = res;
                    break;
                }
                // eslint-disable-next-line no-await-in-loop
                await new Promise((r) => setTimeout(r, intervalMs));
            }

            if (items && items.length > 0) {
                const event = new CustomEvent('showFeedbackPanel', {
                    detail: {
                        items: items.map((it) => ({
                            title: it.title,
                            text: it.text,
                            section: it.section,
                            source: 'Story Studio AI',
                        })),
                    },
                });
                window.dispatchEvent(event);
                logAction(ctx, { "feedback_items": items })
            }
        } catch (err) {
            console.error('Feedback request failed:', err);
        } finally {
            setFeedbackLoading(false);
            setTaskId(null);
        }
    };

    return (
        <ProgressButton
            id="feedback-button"
            logId="feedback-button"
            color="#f87171"
            label="↩ Ask for Feedback"
            progress={progress}
            isRunning={feedbackLoading}
            onClick={handleFeedback}
            disabled={feedbackLoading}
        >
            <span className="flex items-center gap-1.5">
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 12 2 8 6 4"/><path d="M14 14v-2a4 4 0 0 0-4-4H2"/></svg>
                {feedbackLoading ? (stageName || 'Generating...') : 'Ask for Feedback'}
            </span>
        </ProgressButton>
    );
};

export default FeedbackButton;
