import { CodeNode } from '@lexical/code';
import { $convertFromMarkdownString, $convertToMarkdownString } from '@lexical/markdown';
import { AutoLinkNode, LinkNode } from '@lexical/link';
import { ListItemNode, ListNode } from '@lexical/list';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { LinkPlugin } from '@lexical/react/LexicalLinkPlugin';
import { ListPlugin } from '@lexical/react/LexicalListPlugin';
import { MarkdownShortcutPlugin } from '@lexical/react/LexicalMarkdownShortcutPlugin';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { HeadingNode, QuoteNode } from '@lexical/rich-text';
import {
    $getRoot,
    $getSelection,
    $isRangeSelection,
    CAN_REDO_COMMAND,
    CAN_UNDO_COMMAND,
    COMMAND_PRIORITY_LOW,
    FORMAT_TEXT_COMMAND,
    REDO_COMMAND,
    TextFormatType,
    UNDO_COMMAND,
} from 'lexical';
import { useEffect, useMemo, useRef, useState } from 'react';

import { DataStoryLexicalEnvProvider } from './DataStoryLexicalEnv';
import { DATA_STORY_TRANSFORMERS } from './dataStoryTransformers';
import { FigureNode } from './FigureNode';

function InitialMarkdownPlugin({ markdown }: { markdown: string }) {
    const [editor] = useLexicalComposerContext();
    const initialRef = useRef(markdown);

    useEffect(() => {
        const md = initialRef.current;
        editor.update(() => {
            const root = $getRoot();
            root.clear();
            $convertFromMarkdownString(md, DATA_STORY_TRANSFORMERS);
        });
    }, [editor]);

    return null;
}

function EditablePlugin({ editable }: { editable: boolean }) {
    const [editor] = useLexicalComposerContext();
    useEffect(() => {
        editor.setEditable(editable);
    }, [editor, editable]);
    return null;
}

function OnChangeMarkdownPlugin({
    onMarkdownChange,
    enabled,
}: {
    onMarkdownChange: (markdown: string) => void;
    enabled: boolean;
}) {
    const [editor] = useLexicalComposerContext();
    const lastRef = useRef<string | null>(null);
    const skipFirstChangeRef = useRef(true);

    useEffect(() => {
        if (!enabled) {
            lastRef.current = null;
            skipFirstChangeRef.current = true;
            return;
        }
        skipFirstChangeRef.current = true;
        return editor.registerUpdateListener(({ editorState }) => {
            editorState.read(() => {
                const md = $convertToMarkdownString(DATA_STORY_TRANSFORMERS);
                if (lastRef.current === md) {
                    return;
                }
                lastRef.current = md;
                if (skipFirstChangeRef.current) {
                    skipFirstChangeRef.current = false;
                    return;
                }
                onMarkdownChange(md);
            });
        });
    }, [editor, enabled, onMarkdownChange]);

    return null;
}

/**
 * Undo/redo controls for the history HistoryPlugin already maintains.
 *
 * Keyboard shortcuts work without this; the buttons exist because the shortcuts are not
 * discoverable. State is driven by CAN_UNDO_COMMAND / CAN_REDO_COMMAND, which Lexical only
 * dispatches when availability actually flips, so this re-renders a handful of times per
 * session rather than per keystroke. Handlers return false so the commands still reach
 * HistoryPlugin itself.
 *
 * History lives in memory inside the composer, so it is per-edit-session by construction:
 * remounting on a new edit (via composerKey) starts a fresh stack, and nothing is persisted.
 */
const pillBaseClass =
    'flex items-center justify-center min-w-[1.75rem] h-7 px-3 text-xs text-grey-darkest ' +
    'border border-grey-light rounded-full bg-white hover:bg-grey-lighter transition duration-150 ' +
    'disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white';
const pillActiveClass = 'bg-grey-light hover:bg-grey-light text-grey-darkest';

function FormatPill({
    format,
    label,
    title,
    glyphClass,
}: {
    format: TextFormatType;
    label: string;
    title: string;
    glyphClass: string;
}) {
    const [editor] = useLexicalComposerContext();
    const [isActive, setIsActive] = useState(false);

    useEffect(() => {
        return editor.registerUpdateListener(({ editorState }) => {
            editorState.read(() => {
                const selection = $getSelection();
                if ($isRangeSelection(selection)) {
                    setIsActive(selection.hasFormat(format));
                } else {
                    setIsActive(false);
                }
            });
        });
    }, [editor, format]);

    return (
        <button
            type="button"
            log-id={`data-story-format-${format}-button`}
            title={title}
            aria-label={title}
            aria-pressed={isActive}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, format)}
            className={`${pillBaseClass} ${isActive ? pillActiveClass : ''}`}
        >
            <span className={glyphClass}>{label}</span>
        </button>
    );
}

function EditorToolbar() {
    const [editor] = useLexicalComposerContext();
    const [canUndo, setCanUndo] = useState(false);
    const [canRedo, setCanRedo] = useState(false);

    useEffect(() => {
        const unregisterCanUndo = editor.registerCommand<boolean>(
            CAN_UNDO_COMMAND,
            (payload) => {
                setCanUndo(payload);
                return false;
            },
            COMMAND_PRIORITY_LOW,
        );
        const unregisterCanRedo = editor.registerCommand<boolean>(
            CAN_REDO_COMMAND,
            (payload) => {
                setCanRedo(payload);
                return false;
            },
            COMMAND_PRIORITY_LOW,
        );
        return () => {
            unregisterCanUndo();
            unregisterCanRedo();
        };
    }, [editor]);

    return (
        <div className="flex items-center gap-1 px-3 py-2 bg-grey-lighter-2 border-b border-[#d9dde1]">
            <FormatPill format="bold" label="B" title="Bold (Cmd/Ctrl+B)" glyphClass="font-bold" />
            <FormatPill format="italic" label="I" title="Italic (Cmd/Ctrl+I)" glyphClass="italic font-serif" />

            <span className="mx-2 w-px h-4 bg-grey-light" aria-hidden="true" />

            <button
                type="button"
                log-id="data-story-undo-button"
                title="Undo (Cmd/Ctrl+Z)"
                aria-label="Undo"
                disabled={!canUndo}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => editor.dispatchCommand(UNDO_COMMAND, undefined)}
                className={pillBaseClass}
            >
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 8h7a3 3 0 0 1 0 6H7" />
                    <path d="M6 5 3 8l3 3" />
                </svg>
            </button>
            <button
                type="button"
                log-id="data-story-redo-button"
                title="Redo (Cmd/Ctrl+Shift+Z)"
                aria-label="Redo"
                disabled={!canRedo}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => editor.dispatchCommand(REDO_COMMAND, undefined)}
                className={pillBaseClass}
            >
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M13 8H6a3 3 0 0 0 0 6h3" />
                    <path d="M10 5l3 3-3 3" />
                </svg>
            </button>
        </div>
    );
}

const editorTheme = {
    paragraph: 'mb-4',
    text: {
        bold: 'font-bold',
        italic: 'italic',
        underline: 'underline',
        strikethrough: 'line-through',
        code: 'font-mono bg-grey-lighter-2 px-1 rounded',
    },
};

export type DataStoryLexicalFieldProps = {
    /** Stable key segment so the composer remounts when the story snapshot or edit session changes. */
    composerKey: string;
    initialMarkdown: string;
    editable: boolean;
    getCaption: (filename: string) => string;
    onMarkdownChange: (markdown: string) => void;
    /** When false, onChange listener is not registered (view mode). */
    trackChanges: boolean;
    placeholder?: string;
    contentEditableClassName?: string;
    'aria-label'?: string;
};

export function DataStoryLexicalField({
    composerKey,
    initialMarkdown,
    editable,
    getCaption,
    onMarkdownChange,
    trackChanges,
    placeholder = 'Start typing…',
    contentEditableClassName = 'prose max-w-none min-h-[8rem] outline-none text-grey-darkest leading-relaxed text-base px-1 py-2',
    'aria-label': ariaLabel,
}: DataStoryLexicalFieldProps) {
    const initialConfig = useMemo(
        () => ({
            namespace: `DataStory-${composerKey}`,
            theme: editorTheme,
            onError: (e: Error) => {
                if (import.meta.env.DEV) {
                    console.error(e);
                }
            },
            nodes: [
                HeadingNode,
                QuoteNode,
                ListNode,
                ListItemNode,
                CodeNode,
                LinkNode,
                AutoLinkNode,
                FigureNode,
            ],
        }),
        [composerKey],
    );

    return (
        <DataStoryLexicalEnvProvider getCaption={getCaption}>
            <LexicalComposer key={composerKey} initialConfig={initialConfig}>
                <InitialMarkdownPlugin markdown={initialMarkdown} />
                <EditablePlugin editable={editable} />
                <OnChangeMarkdownPlugin onMarkdownChange={onMarkdownChange} enabled={trackChanges} />
                {editable && <EditorToolbar />}
                <div className={`relative ${editable ? 'p-4 bg-white' : ''}`}>
                    <RichTextPlugin
                        contentEditable={
                            <ContentEditable
                                className={contentEditableClassName}
                                aria-label={ariaLabel}
                            />
                        }
                        placeholder={
                            <div className="pointer-events-none absolute top-2 left-1 text-sm text-grey-dark/60">
                                {placeholder}
                            </div>
                        }
                        ErrorBoundary={LexicalErrorBoundary}
                    />
                </div>
                <HistoryPlugin />
                <ListPlugin />
                <LinkPlugin />
                <MarkdownShortcutPlugin transformers={DATA_STORY_TRANSFORMERS} />
            </LexicalComposer>
        </DataStoryLexicalEnvProvider>
    );
}
