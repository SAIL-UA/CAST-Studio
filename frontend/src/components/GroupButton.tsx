import React from 'react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { logAction, captureActionContext } from '../utils/userActionLogger';
import { GroupData } from '../types/types';
import { formatGroupMetadata } from '../utils/groupUtils';

interface GroupButtonProps {
    onClick?: () => Promise<GroupData | undefined>;
}

const GroupButton = ({ onClick }: GroupButtonProps) => {

    const handleGroupManually = async () => {
        if (onClick) {
            const newGroup = await onClick();
            if (newGroup) {
                logAction({ actionType: 'click', elementId: 'group-create-button' }, { group_metadata: await formatGroupMetadata(newGroup) });
            }
        }
    }

    return (
        <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
                <button id="group-button"
                    className="bg-bama-crimson text-sm text-white rounded-full px-3 py-1 mx-1 hover:-translate-y-[.05rem] hover:shadow-lg hover:brightness-95 transition duration-200"
                >
                    <span className="flex items-center justify-center gap-1.5">
                        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="3" cy="8" r="2"/><circle cx="13" cy="4" r="2"/><circle cx="13" cy="12" r="2"/><path d="M5 8l6-3M5 8l6 3"/></svg>
                        Group
                        <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                            <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"></path>
                        </svg>
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
                    <DropdownMenu.Item
                        className="block w-full text-left text-sm text-grey-darkest px-3 py-1.5 cursor-pointer outline-none opacity-40 pointer-events-none"
                    >
                        Group with AI
                    </DropdownMenu.Item>
                    <div className="h-px mx-3 bg-grey" />
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
    )
}

export default GroupButton;
