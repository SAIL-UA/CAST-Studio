/**
 * Latest raw data-story markdown for workspace snapshot saves.
 *
 * NarrativeCache is per user and not tied to named snapshots, so saving a snapshot
 * must capture whatever the Story Browser is showing now — including an unsaved
 * Lexical buffer. DataStories keeps this in sync; WorkspaceMenu reads it on save.
 *
 * Scoped by workspace owner (target_user), matching storyEditState.
 */

const memory = new Map<string, string>();

const scopeKey = (workspaceOwner?: string): string => workspaceOwner || 'self';

export const setStorySnapshotText = (text: string, workspaceOwner?: string): void => {
    memory.set(scopeKey(workspaceOwner), text);
};

export const getStorySnapshotText = (workspaceOwner?: string): string => {
    return memory.get(scopeKey(workspaceOwner)) ?? '';
};

export const clearStorySnapshotText = (workspaceOwner?: string): void => {
    memory.delete(scopeKey(workspaceOwner));
};
