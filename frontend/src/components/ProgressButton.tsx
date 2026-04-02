import React from 'react';

type ProgressButtonProps = {
    progress: number;
    isRunning: boolean;
    color: string;
    label: string;
    disabled?: boolean;
    onClick: (e: React.MouseEvent) => void;
    className?: string;
    children: React.ReactNode;
    logId?: string;
    id?: string;
};

const ProgressButton = ({
    progress,
    isRunning,
    color,
    label,
    disabled = false,
    onClick,
    className = '',
    children,
    logId,
    id,
}: ProgressButtonProps) => {
    const fillColor = color;
    const baseColor = isRunning ? `${color}66` : color;

    return (
        <button
            id={id}
            log-id={logId}
            className={`relative overflow-hidden text-sm text-white rounded-full px-3 py-1 mx-1 hover:-translate-y-[.05rem] hover:shadow-lg hover:brightness-95 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
            style={{ backgroundColor: baseColor }}
            disabled={disabled}
            onClick={onClick}
        >
            {isRunning && (
                <div
                    className="absolute top-0 left-0 h-full transition-[width] duration-500 ease-out"
                    style={{
                        width: `${progress}%`,
                        backgroundColor: fillColor,
                    }}
                />
            )}
            {/* Invisible label sets the minimum width */}
            <span className="invisible whitespace-nowrap">{label}</span>
            {/* Visible text centered on top */}
            <span className="absolute inset-0 flex items-center justify-center z-10">{children}</span>
        </button>
    );
};

export default ProgressButton;
