// Import dependencies
import { useState, useRef } from 'react';
import { exportStory } from '../services/api';
import { logAction, captureActionContext } from '../utils/userActionLogger';

// Import types
import { StoryDataRaw } from '../types/types';

// Props interface
type ExportButtonProps = {
    storyData: StoryDataRaw | null;
}

// Export button component
const ExportButton = ({ storyData }: ExportButtonProps) => {
    
    // State for dropdown visibility
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    
    // Refs
    const exportRef = useRef<HTMLButtonElement>(null);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Handle export
    const handleExport = async (e: React.MouseEvent) => {
        try {
            const ctx = captureActionContext(e);
            const resp = await exportStory((storyData || {}) as StoryDataRaw);
            console.log(storyData);
            const blob = new Blob([resp.data], { type: resp.headers['content-type'] || 'application/pdf' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            const cd = resp.headers['content-disposition'] as string | undefined;
            const match = cd && cd.match(/filename="?([^";]+)"?/i);
            a.href = url;
            a.download = match?.[1] || `data-story-${new Date().toISOString().replace(/[:.-]/g,'')}.pdf`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
            logAction(ctx, { "story_data": storyData });
        }
        catch (error) {
            console.error('Error exporting story:', error);
            alert('An error occurred while exporting the story. Please try again.');
        }
    }

    // Handle mouse enter with delay
    const handleExportEnter = () => {
        // Clear any pending close timeout
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }
        setIsDropdownOpen(true);
    };

    // Handle mouse leave with delay
    const handleExportLeave = () => {
        timeoutRef.current = setTimeout(() => {
            setIsDropdownOpen(false);
        }, 150); // 150ms delay
    };

    // Visible component
    return (
        <div className="relative inline-block">
            <button 
                ref={exportRef}
                id="export-button"
                className="flex items-center bg-bama-crimson text-white text-sm rounded-t-2xl rounded-b-2xl px-3 py-1 mx-1 hover:-translate-y-[.05rem] hover:shadow-lg hover:brightness-95 transition duration-200"
                onMouseEnter={handleExportEnter}
                onMouseLeave={handleExportLeave}
            >
                <span className="flex items-center justify-center gap-2">
                    Export
                    <svg className={`fill-current h-4 w-4 transition-transform duration-300 ease-in ${isDropdownOpen ? 'rotate-180' : 'rotate-0'}`}
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 20 20">
                        <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"></path>
                    </svg>
                </span>
            </button>
            
            {/* Dropdown Menu */}
            {isDropdownOpen && (
                <div 
                    className="absolute top-full z-50 left-0 mt-1 shadow-lg bg-transparent overflow-hidden m-1"
                    onMouseEnter={handleExportEnter}
                    onMouseLeave={handleExportLeave}
                >
                    <button
                        log-id="export-pdf-button"
                        className="block w-full bg-grey-lightest border-grey-light border-2 text-grey-darkest text-sm rounded-sm m-0 py-1 px-2 hover:-translate-y-[.05rem] hover:shadow-lg hover:brightness-95 transition duration-200"
                        onClick={(e) => handleExport(e)}
                    >
                        PDF
                    </button>
                </div>
            )}
        </div>
    )
}

export default ExportButton;