import React, { useState } from 'react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { logAction } from '../utils/userActionLogger';
import type { GroupData } from '../types/types';
import { formatGroupMetadata } from '../utils/groupUtils';
import { aiGroupImages } from '../services/api';
import { useTaskProgress } from '../hooks/useTaskProgress';
import { useGuestTourOpen } from '../utils/useGuestTourOpen';

interface GroupButtonProps {
    onClick?: () => Promise<GroupData | undefined>;
    onGroupComplete?: () => void;
    onError?: (message: string) => void;
    images?: any[];
}

const GroupButton = ({ onClick, onGroupComplete, onError, images = [] }: GroupButtonProps) => {
    const [aiTaskId, setAiTaskId] = useState<string | null>(null);
    const { progress, stageName, error, isComplete } = useTaskProgress(aiTaskId);
    const isLoading = aiTaskId !== null && !isComplete && !error;

    // Force-open during the guest tour screen for group
    const tourOpen = useGuestTourOpen('group');
    const [userOpen, setUserOpen] = useState(false);
    const menuOpen = tourOpen || userOpen;

    // Reset task when complete
    React.useEffect(() => {
        if (isComplete && aiTaskId) {
            const timer = setTimeout(() => {
                setAiTaskId(null);
                onGroupComplete?.();
            }, 600);
            return () => clearTimeout(timer);
        }
    }, [isComplete, aiTaskId]);

    // Show error in modal and reset
    React.useEffect(() => {
        if (error && aiTaskId) {
            onError?.(error);
            setAiTaskId(null);
        }
    }, [error, aiTaskId]);

    const handleGroupManually = async () => {
        if (onClick) {
            const newGroup = await onClick();
            if (newGroup) {
                logAction({ actionType: 'click', elementId: 'group-create-button' }, { group_metadata: await formatGroupMetadata(newGroup) });
            }
        }
    };

    const handleAIGroup = async (mode: 'all' | 'ungrouped') => {
        // Client-side pre-checks
        const freeImages = (images || []).filter((img: any) => !img.scaffoldId && img.in_storyboard);
        const eligible = mode === 'ungrouped'
            ? freeImages.filter((img: any) => !img.groupId)
            : freeImages;

        if (eligible.length === 0) {
            onError?.('No visuals available to group. Add images and annotate them first.');
            return;
        }
        if (eligible.length === 1) {
            onError?.('Too few visuals. Add more in order to group.');
            return;
        }

        try {
            const response = await aiGroupImages(mode);
            if (response.task_id) {
                setAiTaskId(response.task_id);
                logAction({ actionType: 'click', elementId: `group-ai-${mode}` });
            }
        } catch (err: any) {
            const msg = err?.response?.data?.message || 'Failed to start AI grouping.';
            onError?.(msg);
        }
    };

    return (
        <DropdownMenu.Root open={menuOpen} onOpenChange={setUserOpen}>
            <DropdownMenu.Trigger asChild disabled={isLoading}>
                <button id="group-button"
                    data-tour-target="group"
                    className="relative overflow-hidden bg-bama-crimson text-sm text-white rounded-full px-3 py-1 mx-1 hover:-translate-y-[.05rem] hover:shadow-lg hover:brightness-95 transition duration-200 disabled:cursor-not-allowed"
                    style={isLoading ? { backgroundColor: '#005c8466' } : undefined}
                    disabled={isLoading}
                >
                    {isLoading && (
                        <div className="absolute top-0 left-0 h-full transition-[width] duration-500 ease-out" style={{ width: `${progress}%`, backgroundColor: '#005c84' }} />
                    )}
                    <span className="relative z-10 flex items-center justify-center gap-1.5">
                        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="3" cy="8" r="2"/><circle cx="13" cy="4" r="2"/><circle cx="13" cy="12" r="2"/><path d="M5 8l6-3M5 8l6 3"/></svg>
                        {isLoading ? (stageName || 'Grouping...') : 'Group'}
                        {!isLoading && <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"></path></svg>}
                    </span>
                </button>
            </DropdownMenu.Trigger>

            <DropdownMenu.Portal>
                <DropdownMenu.Content
                    className="mt-1 ml-1 shadow-lg z-[400] bg-white rounded-lg py-1 min-w-[200px]"
                    sideOffset={4}
                    align="start"
                    onCloseAutoFocus={(e) => e.preventDefault()}
                >
                    {/* Group with AI - nested submenu */}
                    <DropdownMenu.Sub>
                        <DropdownMenu.SubTrigger
                            className="flex w-full items-center justify-between text-left text-sm text-grey-darkest px-3 py-1.5 hover:bg-grey-lighter cursor-pointer outline-none data-[state=open]:bg-grey-lighter"
                        >
                            Group with AI
                            <svg className="fill-current h-3 w-3 ml-2 opacity-60" viewBox="0 0 20 20"><path d="M7.293 4.293l1.414 1.414L5.414 9H17v2H5.414l3.293 3.293-1.414 1.414L1.586 10z" transform="rotate(180 10 10)"/></svg>
                        </DropdownMenu.SubTrigger>
                        <DropdownMenu.Portal>
                            <DropdownMenu.SubContent
                                className="shadow-lg z-[401] bg-white rounded-lg py-1 min-w-[180px]"
                                sideOffset={4}
                            >
                                <DropdownMenu.Item
                                    className="block w-full text-left text-sm text-grey-darkest px-3 py-1.5 hover:bg-grey-lighter cursor-pointer outline-none"
                                    onSelect={() => handleAIGroup('all')}
                                >
                                    All images
                                </DropdownMenu.Item>
                                <DropdownMenu.Item
                                    className="block w-full text-left text-sm text-grey-darkest px-3 py-1.5 hover:bg-grey-lighter cursor-pointer outline-none"
                                    onSelect={() => handleAIGroup('ungrouped')}
                                >
                                    Ungrouped only
                                </DropdownMenu.Item>
                            </DropdownMenu.SubContent>
                        </DropdownMenu.Portal>
                    </DropdownMenu.Sub>

                    <div className="h-px mx-3 bg-grey" />

                    {/* Group Manually */}
                    <DropdownMenu.Item
                        className="block w-full text-left text-sm text-grey-darkest px-3 py-1.5 hover:bg-grey-lighter cursor-pointer outline-none"
                        log-id="group-create-button"
                        onSelect={() => handleGroupManually()}
                    >
                        Group Manually
                    </DropdownMenu.Item>
                </DropdownMenu.Content>
            </DropdownMenu.Portal>
        </DropdownMenu.Root>
    );
};

export default GroupButton;
