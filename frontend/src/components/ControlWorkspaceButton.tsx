import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { takeControl, returnControl } from '../services/api';
import { logAction } from '../utils/userActionLogger';

const menuItemClass = "block w-full bg-grey-lightest border-grey-light border-2 text-grey-darkest text-sm !font-light rounded-sm m-0 py-1 px-2 hover:-translate-y-[.05rem] hover:shadow-lg hover:brightness-95 transition duration-200 cursor-pointer outline-none text-left";

type ControlWorkspaceButtonProps = {
    shareToken: string;
    controlledBy: string | null;
    currentUserId: string;
    isHost: boolean;
    onControlChanged: (controlledBy: string | null, controlledByName: string | null) => void;
};

const ControlWorkspaceButton = ({ shareToken, controlledBy, currentUserId, isHost, onControlChanged }: ControlWorkspaceButtonProps) => {
    const hasControl = controlledBy === currentUserId;
    const hostHasControl = controlledBy === null;

    const handleTakeControl = async () => {
        try {
            const data = await takeControl(shareToken);
            onControlChanged(data.controlled_by, data.controlled_by_name);
            logAction({ actionType: 'click', elementId: 'collaborate-take-control' }, { share_token: shareToken });
        } catch (err: any) {
            const msg = err?.response?.data?.error || 'Failed to take control';
            alert(msg);
        }
    };

    const handleReturnControl = async () => {
        try {
            const data = await returnControl(shareToken);
            onControlChanged(data.controlled_by, data.controlled_by_name);
            logAction({ actionType: 'click', elementId: 'collaborate-return-control' }, { share_token: shareToken });
        } catch (err: any) {
            const msg = err?.response?.data?.error || 'Failed to return control';
            alert(msg);
        }
    };

    // Host only sees this when someone else has control
    if (isHost && hostHasControl) return null;

    return (
        <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
                <button className="bg-white text-grey-darkest text-xs rounded-full px-3 py-1 shadow-sm hover:-translate-y-[.05rem] hover:shadow-md transition duration-200 whitespace-nowrap">
                    <span className="flex items-center gap-1">
                        Control
                        <svg className="fill-current h-3 w-3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                            <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                        </svg>
                    </span>
                </button>
            </DropdownMenu.Trigger>

            <DropdownMenu.Portal>
                <DropdownMenu.Content
                    className="mt-1 shadow-lg z-[500]"
                    sideOffset={4}
                    align="start"
                    onCloseAutoFocus={(e) => e.preventDefault()}
                >
                    {!hasControl && (
                        <DropdownMenu.Item
                            className={menuItemClass}
                            onSelect={handleTakeControl}
                        >
                            Take Control
                        </DropdownMenu.Item>
                    )}
                    {hasControl && !isHost && (
                        <DropdownMenu.Item
                            className={menuItemClass}
                            onSelect={handleReturnControl}
                        >
                            Return Control
                        </DropdownMenu.Item>
                    )}
                </DropdownMenu.Content>
            </DropdownMenu.Portal>
        </DropdownMenu.Root>
    );
};

export default ControlWorkspaceButton;
