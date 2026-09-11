import { useEffect, useState } from 'react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import {
  getWorkspaces,
  saveWorkspaceAs,
  renameWorkspace,
  activateWorkspace,
  deleteSavedWorkspace,
  type SavedWorkspace,
} from '@/services/api';

type WorkspaceMenuProps = {
  onWorkspaceChanged?: () => void | Promise<void>;
  disabled?: boolean;
};

const WorkspaceMenu = ({ onWorkspaceChanged, disabled = false }: WorkspaceMenuProps) => {
  const [workspaces, setWorkspaces] = useState<SavedWorkspace[]>([]);
  const [limit, setLimit] = useState(3);
  const [saveName, setSaveName] = useState('');
  const [replaceId, setReplaceId] = useState('');
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [alertModal, setAlertModal] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const loadList = async () => {
    try {
      const data = await getWorkspaces();
      setWorkspaces(data.workspaces || []);
      setLimit(data.limit ?? 3);
    } catch (err) {
      console.error('Error loading workspaces:', err);
    }
  };

  useEffect(() => {
    loadList();
  }, []);

  const atCap = workspaces.length >= limit;
  const inactive = workspaces.filter((w) => !w.is_active);

  const handleSaveAs = async () => {
    const name = saveName.trim();
    if (!name) {
      setAlertModal('Enter a name for the saved workspace.');
      return;
    }
    if (atCap && !replaceId) {
      setAlertModal(`You can save at most ${limit} workspaces. Choose one to overwrite, or delete one first.`);
      return;
    }
    setBusy(true);
    try {
      await saveWorkspaceAs(name, atCap ? replaceId : undefined);
      setSaveName('');
      setReplaceId('');
      await loadList();
    } catch (err: any) {
      const code = err?.response?.data?.code;
      if (code === 'workspace_limit') {
        setAlertModal(`Workspace limit of ${limit} reached. Overwrite or delete a saved workspace first.`);
      } else {
        setAlertModal('Could not save workspace.');
      }
    } finally {
      setBusy(false);
    }
  };

  const handleLoad = async (id: string) => {
    setBusy(true);
    try {
      await activateWorkspace(id);
      await loadList();
      await onWorkspaceChanged?.();
    } catch (err) {
      console.error(err);
      setAlertModal('Could not load workspace.');
    } finally {
      setBusy(false);
    }
  };

  const handleRename = async (id: string) => {
    const name = renameValue.trim();
    if (!name) return;
    setBusy(true);
    try {
      await renameWorkspace(id, name);
      setRenameId(null);
      await loadList();
    } catch (err) {
      console.error(err);
      setAlertModal('Could not rename workspace.');
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (id: string) => {
    setBusy(true);
    try {
      await deleteSavedWorkspace(id);
      await loadList();
      await onWorkspaceChanged?.();
    } catch (err: any) {
      if (err?.response?.data?.code === 'last_workspace') {
        setAlertModal('You cannot delete your only workspace.');
      } else {
        setAlertModal('Could not delete workspace.');
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <DropdownMenu.Root onOpenChange={(open) => { if (open) loadList(); }}>
        <DropdownMenu.Trigger asChild>
          <button
            id="workspace-menu-button"
            disabled={disabled}
            className="bg-bama-crimson text-sm text-white rounded-t-2xl rounded-b-2xl px-3 py-1 mx-1 hover:-translate-y-[.05rem] hover:shadow-lg hover:brightness-95 transition duration-200 disabled:opacity-50"
          >
            <span className="flex items-center justify-center gap-2">
              Workspace
              <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"></path>
              </svg>
            </span>
          </button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content
            className="mt-1 shadow-lg z-[400] bg-white rounded-lg py-2 w-[320px]"
            sideOffset={4}
            align="start"
            onCloseAutoFocus={(e) => e.preventDefault()}
          >
            <div className="px-3 pb-2">
              <DropdownMenu.Label className="text-xs text-gray-400 font-medium mb-1">
                Save current
              </DropdownMenu.Label>
              <input
                type="text"
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                placeholder="Workspace name"
                className="w-full text-xs px-2 py-1 border border-grey-lightest rounded mb-2"
                onClick={(e) => e.stopPropagation()}
              />
              {atCap && (
                <select
                  value={replaceId}
                  onChange={(e) => setReplaceId(e.target.value)}
                  className="w-full text-xs px-2 py-1 border border-grey-lightest rounded mb-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  <option value="">Overwrite which saved workspace?</option>
                  {inactive.map((w) => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>
              )}
              <button
                disabled={busy}
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleSaveAs(); }}
                className="text-xs bg-bama-crimson text-white rounded-full px-3 py-1 hover:brightness-95 transition disabled:opacity-50"
              >
                Save As
              </button>
            </div>
            <DropdownMenu.Separator className="h-px bg-grey-lightest my-1" />
            <div className="px-3">
              <DropdownMenu.Label className="text-xs text-gray-400 font-medium mb-1">
                Saved ({workspaces.length}/{limit})
              </DropdownMenu.Label>
              {workspaces.map((w) => (
                <div key={w.id} className="flex flex-col gap-1 py-1 border-b border-grey-lightest last:border-0">
                  {renameId === w.id ? (
                    <div className="flex gap-1">
                      <input
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        className="flex-1 text-xs px-2 py-1 border border-grey-lightest rounded"
                        onClick={(e) => e.stopPropagation()}
                      />
                      <button
                        className="text-xs bg-bama-crimson text-white rounded px-2 py-1"
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleRename(w.id); }}
                      >
                        Save
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs truncate">
                        {w.name}{w.is_active ? ' (active)' : ''}
                      </span>
                      <div className="flex gap-1 shrink-0">
                        {!w.is_active && (
                          <button
                            disabled={busy}
                            className="text-xs text-bama-crimson"
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleLoad(w.id); }}
                          >
                            Load
                          </button>
                        )}
                        <button
                          disabled={busy}
                          className="text-xs text-gray-500"
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setRenameId(w.id); setRenameValue(w.name); }}
                        >
                          Rename
                        </button>
                        <button
                          disabled={busy || workspaces.length <= 1}
                          className="text-xs text-red-600 disabled:opacity-40"
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDelete(w.id); }}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
      {alertModal && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-lg p-4 max-w-sm shadow-lg">
            <p className="text-sm mb-3">{alertModal}</p>
            <button
              className="text-xs bg-bama-crimson text-white rounded-full px-3 py-1"
              onClick={() => setAlertModal(null)}
            >
              OK
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default WorkspaceMenu;
