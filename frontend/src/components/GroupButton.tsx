import React from 'react';
import { logAction } from '../utils/userActionLogger';
import { log } from 'console';

interface GroupButtonProps {
    onClick?: () => void;
}

const GroupButton = ({ onClick }: GroupButtonProps) => {

    // Handle group
    const handleGroup = (e: React.MouseEvent) => {
        logAction(e);
        if (onClick) {
            onClick();
        }
    }

    // Visible component
    return (
        <button id="group-button"
        log-id="group-button"
        className="bg-bama-crimson text-sm text-white rounded-full px-3 py-1 mx-1 hover:-translate-y-[.05rem] hover:shadow-lg hover:brightness-95 transition duration-200"
        onClick={handleGroup}>
        Group Visuals
        </button>
    )
}

export default GroupButton;