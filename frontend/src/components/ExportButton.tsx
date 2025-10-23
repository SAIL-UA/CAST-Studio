// Import dependencies
import { useState, useRef } from 'react';

// Temporary import 
import sample_pdf from '../assets/downloadables/sample_pdf.pdf';
import sample_pptx from '../assets/downloadables/sample_pptx.pptx';

// Export button component
const ExportButton = () => {
    
    // State for dropdown visibility
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    
    // Refs
    const exportRef = useRef<HTMLButtonElement>(null);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Handle export
    const handleExport = async (format: string) => {
        // Format input to lowercase and trim whitespace
        format = format.toLowerCase().trim();

        // Default to pdf if format is not valid
        if (format !== 'pdf' && format !== 'pptx') {
            format = 'pdf';
        }
        // TODO: Send request to backend here with format
        console.log(`Exporting as ${format}`);
        
        const link = document.createElement('a');
        if (format === 'pdf') {
            link.href = sample_pdf;
        } else if (format === 'pptx') {
            link.href = sample_pptx;
        }

        link.download = `sample_${format}.${format}`;
        link.click();
        
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
                        className="block w-full bg-grey-lightest border-grey-light border-2 text-grey-darkest text-sm rounded-sm m-0 py-1 px-2 hover:-translate-y-[.05rem] hover:shadow-lg hover:brightness-95 transition duration-200"
                        onClick={() => handleExport('pdf')}
                    >
                        PDF
                    </button>
                    <button
                        className="block w-full bg-grey-lightest border-grey-light border-2 text-grey-darkest text-sm rounded-sm m-0 py-1 px-2 hover:-translate-y-[.05rem] hover:shadow-lg hover:brightness-95 transition duration-200"
                        onClick={() => handleExport('pptx')}
                    >
                        PPTX
                    </button>
                </div>
            )}
        </div>
    )
}

export default ExportButton;