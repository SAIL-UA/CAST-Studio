import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

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
                    <ChevronDown
                        className={`h-4 w-4 transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
                        strokeWidth={1.5}
                        aria-hidden
                    />
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
