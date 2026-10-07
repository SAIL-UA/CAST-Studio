import React, { useState } from 'react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { logAction } from '@/utils/userActionLogger';
import type { GroupData } from '@/types/types';
import { formatGroupMetadata } from '@/utils/groupUtils';
import { aiGroupImages } from '@/services/api';
import { useTaskProgress } from '@/hooks/useTaskProgress';
import { useGuestTourOpen } from '@/utils/useGuestTourOpen';
import { Share2, ChevronDown, ChevronRight } from 'lucide-react';
import { toolbarBtnRound } from '@/styles/toolbarButtonClasses';

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
                    className={`relative overflow-hidden bg-bama-crimson text-white ${toolbarBtnRound}`}
                    style={isLoading ? { backgroundColor: '#005c8466' } : undefined}
                    disabled={isLoading}
                >
                    {isLoading && (
                        <div className="absolute top-0 left-0 h-full transition-[width] duration-500 ease-out" style={{ width: `${progress}%`, backgroundColor: '#005c84' }} />
                    )}
                    <span className="relative z-10 flex items-center justify-center gap-1.5">
                        <Share2 className="w-3.5 h-3.5" strokeWidth={1.5} aria-hidden />
                        {isLoading ? (stageName || 'Grouping...') : 'Group'}
                        {!isLoading && <ChevronDown className="h-4 w-4" strokeWidth={1.5} aria-hidden />}
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
                            <ChevronRight className="h-3 w-3 ml-2 opacity-60" strokeWidth={1.5} aria-hidden />
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
