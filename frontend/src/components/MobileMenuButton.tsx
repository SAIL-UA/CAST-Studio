import React, { useState, useRef, useEffect } from 'react';

type MobileMenuButtonProps = {
    children: React.ReactNode;
};

const MobileMenuButton = ({ children }: MobileMenuButtonProps) => {
    const [open, setOpen] = useState(false);
    const panelRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);

    // Close when clicking outside
    useEffect(() => {
        if (!open) return;
        const handleClickOutside = (e: MouseEvent) => {
            if (
                panelRef.current && !panelRef.current.contains(e.target as Node) &&
                buttonRef.current && !buttonRef.current.contains(e.target as Node)
            ) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [open]);

    return (
        <div className="relative">
            <button
                id="menu-button-mobile"
                ref={buttonRef}
                className="bg-bama-crimson text-sm text-white rounded-t-2xl rounded-b-2xl px-3 py-1 mx-1 hover:-translate-y-[.05rem] hover:shadow-lg hover:brightness-95 transition duration-200"
                onClick={() => setOpen(prev => !prev)}
            >
                <span className="flex items-center justify-center gap-2">
                    Menu
                    <svg
                        className={`fill-current h-4 w-4 transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 20 20"
                    >
                        <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"></path>
                    </svg>
                </span>
            </button>

            {open && (
                <div
                    ref={panelRef}
                    className="absolute top-full left-0 mt-1 z-[400] bg-white rounded-lg shadow-lg p-2 flex flex-col gap-1"
                >
                    {children}
                </div>
            )}
        </div>
    );
};

export default MobileMenuButton;
