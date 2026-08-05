/**
 * Tracks whether a user has saved manual edits to a generated story.
 *
 * Regenerating overwrites the single NarrativeCache row per user (see the unconditional
 * field assignment in tasks.py), so edits are destroyed on the next generation. This flag
 * lets CraftStoryButton warn before that happens.
 *
 * The key is scoped by workspace owner, because a collaborator who holds control edits the
 * *host's* story, not their own — an unscoped key would conflate the two.
 *
 * Persisted in localStorage so the warning survives a page reload. Known limitation: this is
 * per-browser, so it only warns in the browser that made the edit. If a collaborator edits
 * the host's story, the host's own browser has no record and will not warn before
 * regenerating. Making that reliable needs server-side state (an `edited_at` column).
 */

const STORAGE_PREFIX = 'cast:storyUserEdited';

/** Fired whenever the flag changes, so mounted components can react without polling. */
export const STORY_EDIT_STATE_EVENT = 'storyUserEditedChanged';

/** `workspaceOwner` is the target_user id, or undefined when editing your own workspace. */
const storageKey = (workspaceOwner?: string): string =>
    `${STORAGE_PREFIX}:${workspaceOwner || 'self'}`;

export const getStoryUserEdited = (workspaceOwner?: string): boolean => {
    try {
        return localStorage.getItem(storageKey(workspaceOwner)) === '1';
    } catch {
        return false;
    }
};

export const setStoryUserEdited = (edited: boolean, workspaceOwner?: string): void => {
    try {
        if (edited) {
            localStorage.setItem(storageKey(workspaceOwner), '1');
        } else {
            localStorage.removeItem(storageKey(workspaceOwner));
        }
    } catch {
        // Storage unavailable (e.g. private browsing): the warning just won't survive a reload.
    }
    window.dispatchEvent(
        new CustomEvent(STORY_EDIT_STATE_EVENT, { detail: { edited, workspaceOwner } })
    );
};
