// Import dependencies
import { requestFeedback, requestFeedbackStatus } from '../services/api';
import { logAction } from '../utils/userActionLogger';

type FeedbackItem = { title: string; text: string };

const FeedbackButton = () => {
    const handleFeedback = async (e: React.MouseEvent) => {
        logAction(e);
        try {
            // Start background task
            const startResp = await requestFeedback({});
            const taskId: string = startResp?.task_id;
            if (!taskId) return;

            // Poll until complete
            const start = Date.now();
            const timeoutMs = 60_000; // 60s safety timeout
            const intervalMs = 1500;

            const poll = async (): Promise<FeedbackItem[] | null> => {
                const { status, data } = await requestFeedbackStatus(taskId);
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
                            source: 'Story Studio AI',
                        })),
                    },
                });
                window.dispatchEvent(event);
            }
        } catch (err) {
            // Silent failure for now; optionally surface a toast later
            console.error('Feedback request failed:', err);
        }
    };

    return (
        <button
            id="feedback-button"
            log-id="feedback-button"
            className="bg-red-400 text-sm text-white rounded-full px-3 py-1 mx-1 hover:-translate-y-[.05rem] hover:shadow-lg hover:brightness-95 transition duration-200"
            onClick={handleFeedback}
        >
            Request Feedback
        </button>
    );
};

export default FeedbackButton;