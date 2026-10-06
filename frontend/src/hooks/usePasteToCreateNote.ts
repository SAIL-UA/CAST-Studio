import { useEffect, useRef } from 'react';
import { createNoteWithContent } from '../services/api';

/**
 * Global paste shortcut: when the user hits Cmd+V / Ctrl+V anywhere in the app
 * (except inside inputs / textareas / contenteditable / iframes), and the
 * clipboard contains text, we create a new sticky note pre-populated with that
 * text at the mouse's last known workspace position.
 *
 * Kept intentionally minimal for v1:
 *   - text/plain only. Image and other clipboard payloads are silently ignored
 *     (event is not preventDefault'd, so a browser-level paste target can still
 *     handle them normally).
 *   - Truncated to LONG_DESC_MAX chars client-side; backend re-enforces the cap.
 *   - Placement uses the last mousemove position inside the workspace container,
 *     transformed through the current pan/zoom. Fallback to a default when the
 *     mouse hasn't entered the workspace yet.
 *
 * The refresh signal fires via `onCreated` so the caller can decide how to
 * update its own image list (typically Workspace.fetchUserData).
 */

const LONG_DESC_MAX = 10_000;
const DEFAULT_X = 400;
const DEFAULT_Y = 300;

type Options = {
    readOnly: boolean;
    targetUser?: string;
    // The workspace container that (a) hosts mousemove tracking and (b) is the
    // positioning ancestor used by DraggableCard's absolute `left/top`.
    workspaceRef: React.RefObject<HTMLElement | null>;
    // Current pan/zoom of the workspace canvas — needed to convert screen coords
    // into the "bin coord space" that DraggableCard.x/y live in.
    zoomLevel: number;
    panOffset: { x: number; y: number };
    // Fired after a note is successfully created so the caller can refresh state.
    onCreated: () => void;
};

const isInsideEditableTarget = (target: EventTarget | null): boolean => {
    if (!(target instanceof HTMLElement)) return false;
    // Any input/textarea should keep native paste behavior. Also any element
    // whose subtree is contenteditable (Lexical editor, description fields
    // rendered as contenteditable divs, etc.). closest() walks up ancestors
    // so a paste inside a nested span of a contenteditable still counts.
    if (target.closest('input, textarea, [contenteditable="true"], [contenteditable=""], iframe')) {
        return true;
    }
    return false;
};

export const usePasteToCreateNote = ({
    readOnly,
    targetUser,
    workspaceRef,
    zoomLevel,
    panOffset,
    onCreated,
}: Options) => {
    // Last mouse position inside the workspace container, in client (screen) coords.
    // Kept in a ref (not state) so mousemove doesn't cause re-renders.
    const mouseClientRef = useRef<{ x: number; y: number } | null>(null);

    // Latest zoom/pan in refs so the paste handler always sees current values
    // without being re-created on every zoom/pan change.
    const zoomRef = useRef(zoomLevel);
    const panRef = useRef(panOffset);
    useEffect(() => { zoomRef.current = zoomLevel; }, [zoomLevel]);
    useEffect(() => { panRef.current = panOffset; }, [panOffset]);

    // Track mouse inside the workspace so paste can drop a note at the cursor.
    useEffect(() => {
        const el = workspaceRef.current;
        if (!el) return;
        const handleMove = (e: MouseEvent) => {
            mouseClientRef.current = { x: e.clientX, y: e.clientY };
        };
        const handleLeave = () => {
            // Clear when the mouse leaves the workspace — paste with no recent
            // mouse position falls back to the default placement.
            mouseClientRef.current = null;
        };
        el.addEventListener('mousemove', handleMove);
        el.addEventListener('mouseleave', handleLeave);
        return () => {
            el.removeEventListener('mousemove', handleMove);
            el.removeEventListener('mouseleave', handleLeave);
        };
    }, [workspaceRef]);

    useEffect(() => {
        // Instructor viewing a student's workspace shouldn't be able to inject
        // notes with this shortcut — same policy as the rest of the readOnly
        // treatment in Workspace.
        if (readOnly) return;

        const handlePaste = (event: ClipboardEvent) => {
            if (isInsideEditableTarget(event.target)) return;
            const cd = event.clipboardData;
            if (!cd) return;

            // Prefer plain text; fall back to HTML stripped to text. If the
            // clipboard has only images (or nothing readable), silently do
            // nothing — don't preventDefault so browser can still handle
            // whatever it wants to do elsewhere.
            let text = cd.getData('text/plain');
            if (!text) {
                const html = cd.getData('text/html');
                if (html) {
                    const tmp = document.createElement('div');
                    tmp.innerHTML = html;
                    text = tmp.textContent || '';
                }
            }
            text = text.trim();
            if (!text) return;

            event.preventDefault();
            const truncated = text.slice(0, LONG_DESC_MAX);

            // Convert last mouse position to bin (workspace) coords using the
            // same transform as the drop handler in Bin.tsx: subtract the
            // container origin and pan, then undo the zoom.
            let x = DEFAULT_X;
            let y = DEFAULT_Y;
            const container = workspaceRef.current;
            const mouse = mouseClientRef.current;
            if (container && mouse) {
                const rect = container.getBoundingClientRect();
                const zoom = zoomRef.current || 1;
                const pan = panRef.current || { x: 0, y: 0 };
                x = Math.round((mouse.x - rect.left - pan.x) / zoom);
                y = Math.round((mouse.y - rect.top - pan.y) / zoom);
            }

            createNoteWithContent(truncated, x, y, targetUser)
                .then(() => onCreated())
                .catch(err => {
                    // Silent failure by design (no toast in v1). Still log so
                    // devs can find it in the console if a paste appears to
                    // "do nothing."
                    console.error('[paste-to-note] create failed:', err);
                });
        };

        window.addEventListener('paste', handlePaste as EventListener);
        return () => window.removeEventListener('paste', handlePaste as EventListener);
    }, [readOnly, targetUser, workspaceRef, onCreated]);
};
