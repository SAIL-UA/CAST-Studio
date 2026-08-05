// Import dependencies
import { useState } from 'react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
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

    const [open, setOpen] = useState(false);

    // Handle export
    const handleExport = async (e: React.MouseEvent | React.SyntheticEvent, format: 'pdf' | 'docx' = 'pdf') => {
        try {
            const ctx = captureActionContext(e as React.MouseEvent);
            const resp = await exportStory((storyData || {}) as StoryDataRaw, format);
            const fallbackMime = format === 'docx'
                ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
                : 'application/pdf';
            const blob = new Blob([resp.data], { type: resp.headers['content-type'] || fallbackMime });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            const cd = resp.headers['content-disposition'] as string | undefined;
            const match = cd && cd.match(/filename="?([^";]+)"?/i);
            a.href = url;
            a.download = match?.[1] || `data-story-${new Date().toISOString().replace(/[:.-]/g,'')}.${format}`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
            logAction(ctx, { "story_data": storyData, "format": format });
        }
        catch (error) {
            console.error('Error exporting story:', error);
            alert('An error occurred while exporting the story. Please try again.');
        }
    }

    return (
        <DropdownMenu.Root open={open} onOpenChange={setOpen}>
            <DropdownMenu.Trigger asChild>
                <button
                    id="export-button"
                    log-id="export-button"
                    className="flex items-center bg-bama-crimson text-white text-sm rounded-t-2xl rounded-b-2xl px-3 py-1 hover:-translate-y-[.05rem] hover:shadow-lg hover:brightness-95 transition duration-200"
                >
                    <span className="flex items-center justify-center gap-2">
                        Export
                        <svg
                            className={`fill-current h-4 w-4 transition-transform duration-300 ease-in ${open ? 'rotate-180' : 'rotate-0'}`}
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 20 20"
                        >
                            <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"></path>
                        </svg>
                    </span>
                </button>
            </DropdownMenu.Trigger>

            <DropdownMenu.Portal>
                <DropdownMenu.Content
                    className="mt-1 ml-1 shadow-lg z-[400] bg-white rounded-lg py-1 min-w-[140px] overflow-visible"
                    sideOffset={4}
                    align="start"
                    onCloseAutoFocus={(e) => e.preventDefault()}
                >
                    <DropdownMenu.Item
                        log-id="export-pdf-button"
                        className="block w-full text-left text-sm text-grey-darkest px-3 py-1.5 hover:bg-grey-lighter cursor-pointer outline-none"
                        onSelect={(e) => { e.preventDefault(); handleExport(e as unknown as React.SyntheticEvent, 'pdf'); }}
                    >
                        PDF
                    </DropdownMenu.Item>
                    <div className="h-px mx-3 bg-grey" />
                    <DropdownMenu.Item
                        log-id="export-docx-button"
                        className="block w-full text-left text-sm text-grey-darkest px-3 py-1.5 hover:bg-grey-lighter cursor-pointer outline-none"
                        onSelect={(e) => { e.preventDefault(); handleExport(e as unknown as React.SyntheticEvent, 'docx'); }}
                    >
                        DOCX
                    </DropdownMenu.Item>
                </DropdownMenu.Content>
            </DropdownMenu.Portal>
        </DropdownMenu.Root>
    )
}

export default ExportButton;
