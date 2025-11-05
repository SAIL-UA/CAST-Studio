import React from 'react';
import { logAction, captureActionContext } from '../utils/userActionLogger';
import { GroupData } from '../types/types';
import { formatGroupMetadata } from '../utils/groupUtils';

interface GroupButtonProps {
    onClick?: () => Promise<GroupData | undefined>;
}

const GroupButton = ({ onClick }: GroupButtonProps) => {

    // Handle group
    const handleGroup = async (e: React.MouseEvent) => {
        if (onClick) {
            const ctx = captureActionContext(e);
            const newGroup = await onClick();
            if (newGroup) {
                logAction(ctx, { group_metadata: await formatGroupMetadata(newGroup) });
            }
        }
    }

    // Visible component
    return (
        <button id="group-button"
        log-id="group-create-button"
        className="bg-bama-crimson text-sm text-white rounded-full px-3 py-1 mx-1 hover:-translate-y-[.05rem] hover:shadow-lg hover:brightness-95 transition duration-200"
        onClick={handleGroup}>
        Group Visuals
        </button>
    )
}

export default GroupButton;