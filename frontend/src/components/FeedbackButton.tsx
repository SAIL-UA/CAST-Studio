// Import dependencies
import { useState } from 'react';
import { GroupData, ImageData } from '../types/types';
// import { requestFeedback } from '../services/api';

type FeedbackButtonProps = {
    groups: GroupData[];
    workspaceImages: ImageData[]; // images in storyboard that are NOT in groups
};

const FeedbackButton = ({ groups, workspaceImages }: FeedbackButtonProps) => {
    const [submitting, setSubmitting] = useState(false);

    // Handle feedback request
    const handleFeedback = async (e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        if (submitting) return;
        setSubmitting(true);

        try {
            // Build payload summarizing current workspace state
            const payload = {
                action: 'feedback_request',
                timestamp: new Date().toISOString(),
                workspace_summary: {
                    groups_count: groups.length,
                    ungrouped_count: workspaceImages.length,
                },
                groups: groups.map(g => ({
                    id: g.id,
                    number: g.number,
                    name: g.name,
                    description: g.description,
                    position: { x: g.x, y: g.y },
                    images: (g.cards || []).map(card => ({
                        id: card.id,
                        filepath: card.filepath,
                        short_desc: card.short_desc,
                        long_desc: card.long_desc,
                    }))
                })),
                ungrouped_items: workspaceImages.map(img => ({
                    id: img.id,
                    filepath: img.filepath,
                    position: { x: img.x, y: img.y },
                    short_desc: img.short_desc,
                    long_desc: img.long_desc,
                })),
            };

            // Temporarily disable backend call; just emit event to show UI
            // const res = await requestFeedback(payload);
            // if (!(res && (res.message || '').toLowerCase().includes('success'))) {
            //   console.warn('Feedback request did not succeed:', res);
            // }

            // Dispatch custom event to open feedback panel with placeholders
            const feedbackEvent = new CustomEvent('showFeedbackPanel', {
                detail: { requestedAt: payload.timestamp }
            });
            window.dispatchEvent(feedbackEvent);
        } catch (error) {
            console.error('Error initiating feedback UI:', error);
        } finally {
            setSubmitting(false);
        }
    };

    // Visible component
    return (
        <button
            id="feedback-button"
            className="bg-red-400 text-sm text-white rounded-full px-3 py-1 mx-1 hover:-translate-y-[.05rem] hover:shadow-lg hover:brightness-95 transition duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
            onClick={handleFeedback}
            disabled={submitting}
        >
            {submitting ? 'Submitting…' : 'Request Feedback'}
        </button>
    );
};

export default FeedbackButton;
