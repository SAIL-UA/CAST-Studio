// Import dependencies
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { getNarrativeCache, getImageDataAll, updateNarrativeCache } from '../services/api';
import { storyDataToNarrativeCachePayload } from '../utils/narrativeCacheMapping';
import { GeneratingPlaceholder } from './GeneratingPlaceholder';
import { logAction } from '../utils/userActionLogger';
import { getImageUrl } from '../utils/imageUtils';
import { scrollTracker } from '../utils/scrollTracker';
import { setStoryUserEdited } from '../utils/storyEditState';

// Import components
import ExportButton from './ExportButton';
import FeedbackButton from './FeedbackButton';
import { DataStoryLexicalField } from './dataStory/DataStoryLexicalField';


// Story data interface
interface StoryData {
    story_structure_id?: string;
    narrative?: string;
    recommended_order?: string[];
    categorize_figures_response?: string;
    theme_response?: string;
    sequence_response?: string;
}

/**
 * Canonicalises raw narrative markdown before it is either rendered or edited.
 *
 * Two fixups, both driven by what the generator actually emits:
 *  - Section headers appear inconsistently ("### Introduction", "**Main Body**", or a bare
 *    "Conclusion" line) and the read view has always stripped them. Applying that here, to
 *    the raw text, keeps the editor and the read view identical — otherwise entering edit
 *    mode would make hidden headings suddenly appear.
 *  - Figure tags are sometimes doubled up as "[FIGURE: [FIGURE: x.png]]". The read view's
 *    regex swallows both closing brackets, but the editor's transformer matches only the
 *    inner tag and would leave a stray "]" sitting in the prose.
 */
const normalizeNarrativeMarkdown = (markdown: string): string =>
    markdown
        .replace(/\[FIGURE:\s*\[FIGURE:\s*([^[\]]+)\]\s*\]/gi, '[FIGURE: $1]')
        .replace(/^#{1,3}\s*(Introduction|Main Body|Conclusion)\s*:?\s*$/gim, '\n')
        .replace(/^\s*-?\s*\*\*(Introduction|Main Body|Conclusion)\*\*\s*:?\s*$/gim, '\n')
        .replace(/^\s*(Introduction|Main Body|Conclusion)\s*:?\s*$/gim, '\n');

// DataStories component
type DataStoriesProps = {
    targetUser?: string;
    /** Non-owner view: hides Export. Kept separate from canEdit so a host who has delegated
     *  control can still export while being unable to edit. */
    readOnly?: boolean;
    /** Whether story editing is permitted. Defaults to !readOnly for callers that don't
     *  distinguish the two. The backend enforces this independently. */
    canEdit?: boolean;
    refreshTrigger?: number;
};

// Shared geometry for the header's story-editing buttons so they line up as one row: identical
// padding, a border on every variant (a border on only some made them differ in height), and no
// horizontal margin — the header's `gap-3` is the single source of spacing.
const storyActionButton =
    'flex items-center justify-center whitespace-nowrap shrink-0 text-sm border ' +
    'rounded-t-2xl rounded-b-2xl px-3 py-1 hover:-translate-y-[.05rem] hover:shadow-lg ' +
    'hover:brightness-95 transition duration-200 disabled:opacity-50 ' +
    'disabled:cursor-not-allowed disabled:hover:translate-y-0';
const storyActionPrimary = `${storyActionButton} bg-bama-crimson text-white border-transparent`;
const storyActionSecondary = `${storyActionButton} bg-grey-lightest text-grey-darkest border-grey-light`;

const DataStories = ({ targetUser, readOnly = false, canEdit, refreshTrigger }: DataStoriesProps) => {

    const editingAllowed = canEdit ?? !readOnly;

    // State
    const [narrativeSelected, setNarrativeSelected] = useState(true);
    const [storySelected, setStorySelected] = useState(false);
    const [storyData, setStoryData] = useState<StoryData | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [processedNarrative, setProcessedNarrative] = useState<string>('');
    const [processedTheme, setProcessedTheme] = useState<string>('');
    const [processedSequence, setProcessedSequence] = useState<string>('');
    const [isProcessingImages, setIsProcessingImages] = useState(false);
    const [processedRecommended, setProcessedRecommended] = useState<string[]>([]);
    const [imageDescriptions, setImageDescriptions] = useState<Record<string, string>>({});

    // Story editing state
    const [isEditing, setIsEditing] = useState(false);
    const [editNarrative, setEditNarrative] = useState('');
    const [editSessionId, setEditSessionId] = useState(0);
    const [saveLoading, setSaveLoading] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);

    // Mirrors isEditing for listeners registered once on mount, which would otherwise
    // close over a stale value.
    const isEditingRef = useRef(false);
    useEffect(() => {
        isEditingRef.current = isEditing;
    }, [isEditing]);

    // Set when a workspace_update was suppressed because the editor was open.
    const missedUpdateRef = useRef(false);

    // Check for existing cached narrative on component mount
    const loadCachedNarrative = async () => {
        try {
            const response = await getNarrativeCache(targetUser);
            if (response.data && response.data.data) {
                const cacheData = response.data.data;
                setStoryData({
                    story_structure_id: cacheData.story_structure_id,
                    narrative: cacheData.narrative,
                    recommended_order: cacheData.order,
                    categorize_figures_response: cacheData.categories,
                    theme_response: cacheData.theme,
                    sequence_response: cacheData.sequence_justification
                });
                console.log('Loaded cached narrative data:', cacheData);
            }
        } catch (error) {
            console.log('No cached narrative found or error loading:', error);
        }
    };

    // Fetch image descriptions to use as captions
    const loadImageDescriptions = async () => {
        try {
            const response = await getImageDataAll(targetUser);
            if (response.data && response.data.images) {
                const descMap: Record<string, string> = {};
                for (const img of response.data.images) {
                    if (img.filepath && img.long_desc) {
                        descMap[img.filepath] = img.long_desc;
                    }
                }
                setImageDescriptions(descMap);
            }
        } catch (error) {
            console.log('Error loading image descriptions:', error);
        }
    };

    // Effect
    useEffect(() => {
        setNarrativeSelected(true)
        setStorySelected(false)

        // Check for cached narrative and load it (if it exists) on mount
        loadCachedNarrative();
        loadImageDescriptions();

        // Listen for story generation events
        const handleStoryGenerated = (event: Event) => {
            const customEvent = event as CustomEvent;
            const data = customEvent.detail;
            setIsGenerating(false);
            console.log('Story data received:', data);

            // A fresh generation supersedes any edit in progress, and the user already
            // confirmed the overwrite in CraftStoryButton before we got here.
            setIsEditing(false);
            setEditNarrative('');
            setSaveError(null);

            // Story data already has processed figures from GenerateStoryButton
            setStoryData(data);
            loadImageDescriptions();
        };

        // Listen for story generation start events
        const handleStoryGenerationStarted = () => {
            setIsGenerating(true);
            console.log('Story generation started');
        };

        window.addEventListener('storyGenerated', handleStoryGenerated as EventListener);
        window.addEventListener('storyGenerationStarted', handleStoryGenerationStarted as EventListener);

        // Cleanup
        return () => {
            window.removeEventListener('storyGenerated', handleStoryGenerated as EventListener);
            window.removeEventListener('storyGenerationStarted', handleStoryGenerationStarted as EventListener);

            // Flush any pending scroll events before unmounting
            scrollTracker.flush();
        };
    }, [])

    // Refetch when refreshTrigger changes (from WebSocket workspace_update)
    useEffect(() => {
        if (refreshTrigger && refreshTrigger > 0) {
            // Never reload underneath an open editor. Saving the narrative fires a post_save
            // signal that broadcasts workspace_update, which comes straight back to the host's
            // own socket — reloading here would wipe the buffer mid-edit. Remember that we
            // skipped one so we can catch up on exit instead of staying silently stale.
            if (isEditingRef.current) {
                missedUpdateRef.current = true;
                return;
            }
            loadCachedNarrative();
            loadImageDescriptions();
        }
    }, [refreshTrigger]);

    // Catch up on any update that arrived while the editor was open.
    useEffect(() => {
        if (!isEditing && missedUpdateRef.current) {
            missedUpdateRef.current = false;
            loadCachedNarrative();
            loadImageDescriptions();
        }
    }, [isEditing]);

    // Control can be handed back mid-edit, revoking edit permission. Close the editor
    // rather than leaving a field open that the server will now reject writes from.
    useEffect(() => {
        if (!editingAllowed && isEditing) {
            setIsEditing(false);
            setEditNarrative('');
            setSaveError('Editing stopped: control of this workspace changed. Unsaved changes were discarded.');
        }
    }, [editingAllowed, isEditing]);


    // Process narrative text to replace [FIGURE: filename] with blob URLs
    const processNarrativeWithImages = async (text: string): Promise<string> => {
        if (!text) return text;
        
        console.log('Processing text:', text);
        
        // Find all figure placeholders - handle nested FIGURE tags
        const figurePattern = /\[FIGURE:\s*(?:\[FIGURE:\s*)?([^[\]]+\.(?:png|jpg|jpeg|gif|webp))\]?\]/gi;
        const matches: RegExpExecArray[] = [];
        let match;
        while ((match = figurePattern.exec(text)) !== null) {
            matches.push(match);
        }
        
        console.log('Found matches:', matches);
        
        if (matches.length === 0) return text;
        
        let processedText = text;
        
        // Process each figure placeholder
        for (const match of matches) {
            const fullMatch = match[0];
            let filename = match[1].trim();
            
            // Clean up any nested FIGURE tags in filename
            filename = filename.replace(/^\[FIGURE:\s*/, '').replace(/\]$/, '');
            
            console.log('Processing match:', { fullMatch, filename });
            
            try {
                const imageUrl = getImageUrl(filename);
                console.log('Generated image URL:', imageUrl);
                // Build caption from long_desc if available
                const desc = imageDescriptions[filename];
                const caption = desc
                    ? `Figure: ${desc.slice(0, 100)}${desc.length > 100 ? '...' : ''}`
                    : 'Figure';
                // Replace with markdown image syntax using image URL
                const replacement = `![${caption}](${imageUrl})`;
                processedText = processedText.replace(fullMatch, replacement);
                console.log('Replacement made:', { fullMatch, replacement });
            } catch (error) {
                if (process.env.NODE_ENV === 'development') {
                    console.error(`Error loading image ${filename}:`, error);
                }
                // Replace with error placeholder
                const replacement = `*[Image not available: ${filename}]*`;
                processedText = processedText.replace(fullMatch, replacement);
            }
        }
        
        console.log('Final processed text:', processedText);
        return processedText;
    };

    // Process all narrative content when storyData changes
    useEffect(() => {
        const processAllContent = async () => {
            if (!storyData) {
                setProcessedNarrative('');
                setProcessedTheme('');
                setProcessedSequence('');
                setProcessedRecommended([]);
                return;
            }

            setIsProcessingImages(true);

            try {
                const processedNarrativeTextPromise = processNarrativeWithImages(normalizeNarrativeMarkdown(storyData.narrative || ''));
                const processedThemeTextPromise = processNarrativeWithImages(storyData.theme_response || '');
                const processedSequenceTextPromise = processNarrativeWithImages(storyData.sequence_response || '');

                const recommendedList = storyData.recommended_order || [];
                const processedRecommendedPromises = recommendedList.map((filename) =>
                    processNarrativeWithImages(`[FIGURE: ${filename}]`)
                );

                const [
                    processedNarrativeText,
                    processedThemeText,
                    processedSequenceText,
                    processedRecommendedList
                ] = await Promise.all([
                    processedNarrativeTextPromise,
                    processedThemeTextPromise,
                    processedSequenceTextPromise,
                    Promise.all(processedRecommendedPromises)
                ]);

                setProcessedNarrative(processedNarrativeText);
                setProcessedTheme(processedThemeText);
                setProcessedSequence(processedSequenceText);
                setProcessedRecommended(processedRecommendedList);
            } catch (error) {
                console.error('Error processing images:', error);
            } finally {
                setIsProcessingImages(false);
            }
        };

        processAllContent();
    }, [storyData, imageDescriptions]);

    const formatStoryStructureName = (structureId?: string) => {
        if (!structureId) return '';
        // Multi-scaffold: "multi:question_answer,time_based" → "Multiple (Question Answer, Time Based)"
        if (structureId.startsWith('multi:')) {
            const ids = structureId.slice(6).split(',');
            const names = ids.map(id =>
                id.split('_').filter(Boolean).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
            );
            return `Multiple (${names.join(', ')})`;
        }
        return structureId
            .split('_')
            .filter(Boolean)
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    };

    const headerPattern = formatStoryStructureName(storyData?.story_structure_id);

    // Unified components for all ReactMarkdown sections
    const markdownComponents = {
        p: ({node, children, ...props}: any) => {
            // If this paragraph contains an image, render as a div to avoid nesting issues
            const hasImage = Array.isArray(children)
                ? children.some((child: any) => child?.type?.name === 'img' || child?.props?.src)
                : false;
            if (hasImage) {
                return <div {...props}>{children}</div>;
            }
            return <p className="mb-4" {...props}>{children}</p>;
        },
        img: ({node, ...props}: any) => {
            return (
                <div className="flex flex-col items-center justify-center w-full h-[35dvh]" style={{ marginTop: '2.5rem', marginBottom: '1rem' }}>
                    <img
                        {...props}
                        className="w-auto h-full object-contain rounded-md shadow-sm m-0 p-0"
                    />
                    <p className="text-sm text-grey-dark mt-2 italic" style={{ marginBottom: '2rem' }}>
                        {props.alt || 'Figure'}
                    </p>
                </div>
            );
        }
    };

    // Smaller image components for recommended figure order
    const smallImageComponents = {
        p: markdownComponents.p,
        img: ({node, ...props}: any) => {
            return (
                <div className="flex flex-col items-center justify-center w-full" style={{ zoom: 0.5 }}>
                    <img
                        {...props}
                        className="w-auto h-auto max-h-[35dvh] object-contain rounded-md shadow-sm m-0 p-0"
                    />
                </div>
            );
        }
    };

    // URL transform function for all sections
    const urlTransform = (url: string) => {
        console.log('URL transform called with:', url);
        return url;
    };

    // Caption shown under an inline figure while editing — mirrors the read view's caption.
    const getCaption = useCallback((filename: string) => {
        const desc = imageDescriptions[filename];
        return desc
            ? `Figure: ${desc.slice(0, 100)}${desc.length > 100 ? '...' : ''}`
            : 'Figure';
    }, [imageDescriptions]);

    // The saved narrative as the editor represents it, used as both the seed and the
    // baseline for the dirty check.
    const editableNarrative = useMemo(
        () => normalizeNarrativeMarkdown(storyData?.narrative || ''),
        [storyData?.narrative]
    );

    const isDirty = isEditing && editNarrative !== editableNarrative;

    // Export must reflect what the user currently sees, including an unsaved buffer.
    const exportStoryData = useMemo(() => {
        if (!storyData) return storyData;
        return isEditing ? { ...storyData, narrative: editNarrative } : storyData;
    }, [storyData, isEditing, editNarrative]);

    // Enter edit mode. The bumped session id remounts the composer with fresh content.
    const handleBeginEdit = (e: React.MouseEvent) => {
        logAction(e);
        setEditNarrative(editableNarrative);
        setEditSessionId(id => id + 1);
        setSaveError(null);
        setIsEditing(true);
    };

    const handleCancelEdit = (e: React.MouseEvent) => {
        logAction(e);
        setIsEditing(false);
        setEditNarrative('');
        setSaveError(null);
    };

    const handleSaveEdit = async (e: React.MouseEvent) => {
        if (!storyData || saveLoading) return;
        logAction(e);

        const previousNarrative = storyData.narrative || '';
        const updated: StoryData = { ...storyData, narrative: editNarrative };

        setSaveLoading(true);
        setSaveError(null);
        try {
            const result = await updateNarrativeCache(
                storyDataToNarrativeCachePayload(updated),
                targetUser
            );
            if (result?.status !== 'success') {
                setSaveError(typeof result?.message === 'string' ? result.message : 'Save failed');
                return;
            }

            setStoryData(updated);
            setIsEditing(false);
            setEditNarrative('');
            setStoryUserEdited(true, targetUser);

            // Research record: the generated text is overwritten in the DB, so keep both
            // versions in the action log where they stay recoverable.
            logAction(
                { actionType: 'click', elementId: 'data-stories-save-story-result' },
                { previous_narrative: previousNarrative, new_narrative: editNarrative }
            );
        } catch (error) {
            console.error('Error saving story:', error);
            // A 403 here means control changed hands mid-edit; surface the server's reason
            // rather than axios's generic "Request failed with status code 403".
            const detail = (error as any)?.response?.data?.detail
                ?? (error as any)?.response?.data?.message;
            setSaveError(
                typeof detail === 'string'
                    ? detail
                    : error instanceof Error ? error.message : 'Save failed'
            );
        } finally {
            setSaveLoading(false);
        }
    };

    // Handle narrative button
    const handleNarrative = (e: React.MouseEvent) => {
        logAction(e);
        setNarrativeSelected(true)
        setStorySelected(false)
    }

    const handleStory = (e: React.MouseEvent) => {
        logAction(e);
        setNarrativeSelected(false)
        setStorySelected(true)

    }

    // Handle scroll events - batched and sent after 5 seconds of inactivity
    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const target = e.currentTarget;
        const elementId = target.id || target.getAttribute('log-id') || 'unknown';
        const scrollPercentage = Math.round((target.scrollTop / (target.scrollHeight - target.clientHeight)) * 100);

        scrollTracker.trackScroll(
            elementId,
            target.scrollTop,
            target.scrollHeight,
            target.clientHeight,
            scrollPercentage
        );
    }

    // Visible component
    return (
        <div id="data-stories-container" className="flex flex-col w-full">
            {/* Header */}
            <div id="data-stories-header" className="flex w-full items-center bg-grey-lighter-2 rounded-t-lg p-3">
                <div id="data-stories-header-left" className="flex items-center gap-3">
                    <span className="bg-bama-crimson text-white text-lg font-roboto-semibold px-3 py-1.5 rounded-lg">Data Stories</span>
                    {!readOnly && <ExportButton storyData={exportStoryData} />}

                    {/* Editing controls — Story tab only, and only when editing is permitted */}
                    {editingAllowed && storySelected && storyData?.narrative && (
                        isEditing ? (
                            <>
                                <button
                                    id="save-story-button"
                                    log-id="data-stories-save-story-button"
                                    onClick={handleSaveEdit}
                                    disabled={saveLoading || !isDirty}
                                    className={`${storyActionPrimary} min-w-[5.25rem]`}
                                >
                                    {saveLoading ? 'Saving...' : 'Save'}
                                </button>
                                <button
                                    id="cancel-edit-story-button"
                                    log-id="data-stories-cancel-edit-story-button"
                                    onClick={handleCancelEdit}
                                    disabled={saveLoading}
                                    className={`${storyActionSecondary} min-w-[5.25rem]`}
                                >
                                    Cancel
                                </button>
                            </>
                        ) : (
                            <button
                                id="edit-story-button"
                                log-id="data-stories-edit-story-button"
                                onClick={handleBeginEdit}
                                className={storyActionPrimary}
                            >
                                Edit Story
                            </button>
                        )
                    )}
                </div>
                <div id="data-stories-header-right" className="flex flex-1 items-center justify-end text-sm">

                    <button id="story-button"
                    log-id="data-stories-story-button"
                    className={`underline-animate ${storySelected ? 'active' : ''} mx-3`}
                    onClick={handleStory}>
                    Story
                    </button>

                    <button id="narrative-button"
                    log-id="data-stories-narrative-button"
                    className={`underline-animate ${narrativeSelected ? 'active' : ''} mx-3`}
                    onClick={handleNarrative}
                    >
                    Reasoning
                    </button>


                </div>
            </div>

            {/* Content */}
            <div
                id="data-stories-content"
                log-id="data-stories-content"
                className="flex flex-col w-full rounded-sm p-4 bg-grey-lighter-2"
                onScroll={handleScroll}
            >
                {narrativeSelected ? (
                    // Narrative Structuring Content
                    <div className="w-full space-y-6">
                        <h3 className="text-xl font-semibold text-grey-darkest mb-4">Narrative Structure{headerPattern ? `: ${headerPattern}` : ''}</h3>
                        
                        {isGenerating ? (
                            <GeneratingPlaceholder contentName="narrative analysis" lines={6} />
                        ) : isProcessingImages ? (
                            <GeneratingPlaceholder contentName="processing images" lines={4} />
                        ) : storyData ? (
                            <>
                                {/* Theme and Objective */}
                                {storyData.theme_response && (
                                    <div className="p-4 rounded-lg">
                                        <h4 className="font-semibold text-grey-darkest mb-2">Theme and Objective</h4>
                                        <div className="text-grey-darkest">
                                            <ReactMarkdown
                                                components={markdownComponents}
                                                urlTransform={urlTransform}
                                                skipHtml={false}
                                            >
                                                {processedTheme}
                                            </ReactMarkdown>
                                        </div>
                                    </div>
                                )}

                                {/* Sequence Justification */}
                                {storyData.sequence_response && (
                                    <div className="p-4 rounded-lg">
                                        <h4 className="font-semibold text-grey-darkest mb-2">Sequence Justification</h4>
                                        <div className="text-grey-darkest">
                                            <ReactMarkdown
                                                components={markdownComponents}
                                                urlTransform={urlTransform}
                                                skipHtml={false}
                                            >
                                                {processedSequence}
                                            </ReactMarkdown>
                                        </div>
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="text-center text-grey-darkest mt-8">
                                <p>No narrative structure data available.</p>
                                <p className="text-sm mt-2">Click "Generate Story" to create narrative insights.</p>
                            </div>
                        )}
                    </div>
                ) : (
                    // Generated Story Content (when storySelected is true)
                    <div className="w-full">
                        <h3 className="text-xl font-semibold text-grey-darkest mb-4">Generated Story{headerPattern ? `: ${headerPattern}` : ''}</h3>
                        
                        {isGenerating ? (
                            <GeneratingPlaceholder contentName="data story" lines={8} />
                        ) : isProcessingImages ? (
                            <GeneratingPlaceholder contentName="processing images" lines={4} />
                        ) : storyData?.narrative ? (
                            <div className="p-4 rounded-lg">
                                {isEditing ? (
                                    /* Seeded from the raw narrative, never from processedNarrative —
                                       that one has [FIGURE: …] tokens rewritten into image URLs, and
                                       saving it would destroy the placeholders permanently. */
                                    <DataStoryLexicalField
                                        composerKey={`story-${editSessionId}`}
                                        initialMarkdown={editNarrative}
                                        editable={true}
                                        getCaption={getCaption}
                                        onMarkdownChange={setEditNarrative}
                                        trackChanges={true}
                                        placeholder="Write your data story..."
                                        aria-label="Edit generated story"
                                    />
                                ) : (
                                    <div className="prose max-w-none text-grey-darkest leading-relaxed text-base">
                                        <ReactMarkdown
                                            components={markdownComponents}
                                            urlTransform={urlTransform}
                                            skipHtml={false}
                                        >
                                            {processedNarrative}
                                        </ReactMarkdown>
                                    </div>
                                )}

                                {/* Rendered outside the editor branch so a message set while losing
                                    control (which closes the editor) is still visible. */}
                                {saveError && (
                                    <p className="mt-3 text-sm text-bama-crimson">{saveError}</p>
                                )}
                            </div>
                        ) : (
                            <div className="text-center text-grey-darkest mt-8">
                                <p>No story generated yet.</p>
                                <p className="text-sm mt-2">Click "Generate Story" to create your data story.</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}

export default DataStories;