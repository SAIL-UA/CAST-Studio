// Import dependencies
import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { getNarrativeCache, getImageDataAll, updateNarrativeCache } from '../services/api';
import { storyDataToNarrativeCachePayload } from '../utils/narrativeCacheMapping';
import { GeneratingPlaceholder } from './GeneratingPlaceholder';
import { logAction } from '../utils/userActionLogger';
import { getImageUrl } from '../utils/imageUtils';
import { scrollTracker } from '../utils/scrollTracker';

// Import components
import ExportButton from './ExportButton';
import FeedbackButton from './FeedbackButton';


// Story data interface
interface StoryData {
    story_structure_id?: string;
    narrative?: string;
    recommended_order?: string[];
    categorize_figures_response?: string;
    theme_response?: string;
    sequence_response?: string;
}

function cloneStoryData(s: StoryData): StoryData {
    return {
        ...s,
        recommended_order: s.recommended_order ? [...s.recommended_order] : undefined,
    };
}

interface StoryInstance {
    id: string;
    label: string;
    history: StoryData[];
    historyIndex: number;
    syncedKey: string;
}

function storySnapshotKey(s: StoryData | null): string {
    if (!s) return '';
    return JSON.stringify({
        story_structure_id: s.story_structure_id ?? '',
        narrative: s.narrative ?? '',
        recommended_order: s.recommended_order ?? [],
        categorize_figures_response: s.categorize_figures_response ?? '',
        theme_response: s.theme_response ?? '',
        sequence_response: s.sequence_response ?? '',
    });
}

function truncateDropdownLabel(text: string, maxLength = 15): string {
    if (text.length <= maxLength) return text;
    return `${text.slice(0, maxLength - 3)}...`;
}

// DataStories component
const DataStories = () => {

    // State
    const [narrativeSelected, setNarrativeSelected] = useState(true);
    const [storySelected, setStorySelected] = useState(false);
    const [storyInstances, setStoryInstances] = useState<StoryInstance[]>([]);
    const [selectedStoryIndex, setSelectedStoryIndex] = useState(0);
    const [saveLoading, setSaveLoading] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);
    const [persistedStoryId, setPersistedStoryId] = useState<string | null>(null);
    const touchLastTapRef = useRef(0);
    const [isGenerating, setIsGenerating] = useState(false);
    const [processedNarrative, setProcessedNarrative] = useState<string>('');
    const [processedTheme, setProcessedTheme] = useState<string>('');
    const [processedSequence, setProcessedSequence] = useState<string>('');
    const [isProcessingImages, setIsProcessingImages] = useState(false);
    const [processedRecommended, setProcessedRecommended] = useState<string[]>([]);
    const [imageDescriptions, setImageDescriptions] = useState<Record<string, string>>({});
    const [isEditingContent, setIsEditingContent] = useState(false);
    const [editNarrative, setEditNarrative] = useState('');
    const [editTheme, setEditTheme] = useState('');
    const [editSequence, setEditSequence] = useState('');

    const selectedStory = storyInstances[selectedStoryIndex] || null;
    const storyData = selectedStory ? selectedStory.history[selectedStory.historyIndex] : null;

    // Check for existing cached narrative on component mount
    const loadCachedNarrative = async () => {
        try {
            const response = await getNarrativeCache();
            if (response.data && response.data.data) {
                const cacheData = response.data.data;
                const mapped: StoryData = {
                    story_structure_id: cacheData.story_structure_id,
                    narrative: cacheData.narrative,
                    recommended_order: cacheData.order,
                    categorize_figures_response: cacheData.categories,
                    theme_response: cacheData.theme,
                    sequence_response: cacheData.sequence_justification
                };
                const instance: StoryInstance = {
                    id: `saved-${Date.now()}`,
                    label: 'Saved Story',
                    history: [mapped],
                    historyIndex: 0,
                    syncedKey: storySnapshotKey(mapped),
                };
                setStoryInstances([instance]);
                setSelectedStoryIndex(0);
                setPersistedStoryId(instance.id);
                setSaveError(null);
            }
        } catch (error) {
            console.log('No cached narrative found or error loading:', error);
        }
    };

    // Fetch image descriptions to use as captions
    const loadImageDescriptions = async () => {
        try {
            const response = await getImageDataAll();
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
            const data = customEvent.detail as StoryData;
            setIsGenerating(false);
            setIsEditingContent(false);
            let generatedInstanceId = '';
            setStoryInstances((prev) => {
                const nextIndex = prev.length + 1;
                const nextInstance: StoryInstance = {
                    id: `generated-${Date.now()}-${nextIndex}`,
                    label: formatStoryInstanceLabel(data.story_structure_id, nextIndex),
                    history: [cloneStoryData(data)],
                    historyIndex: 0,
                    syncedKey: storySnapshotKey(data),
                };
                generatedInstanceId = nextInstance.id;
                setSelectedStoryIndex(prev.length);
                return [...prev, nextInstance];
            });
            setSaveError(null);
            loadImageDescriptions();
            if (generatedInstanceId) {
                void persistStorySnapshot(generatedInstanceId, data, { markAsPersisted: true });
            }
        };

        // Listen for story generation start events
        const handleStoryGenerationStarted = () => {
            setIsGenerating(true);
            // console.log('Story generation started');
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


    // Process narrative text to replace [FIGURE: filename] with blob URLs
    const processNarrativeWithImages = async (text: string): Promise<string> => {
        if (!text) return text;
        
        // console.log('Processing text:', text);
        
        // Find all figure placeholders - handle nested FIGURE tags
        const figurePattern = /\[FIGURE:\s*(?:\[FIGURE:\s*)?([^[\]]+\.(?:png|jpg|jpeg|gif|webp))\]?\]/gi;
        const matches: RegExpExecArray[] = [];
        let match;
        while ((match = figurePattern.exec(text)) !== null) {
            matches.push(match);
        }
        
        // console.log('Found matches:', matches);
        
        if (matches.length === 0) return text;
        
        let processedText = text;
        
        // Process each figure placeholder
        for (const match of matches) {
            const fullMatch = match[0];
            let filename = match[1].trim();
            
            // Clean up any nested FIGURE tags in filename
            filename = filename.replace(/^\[FIGURE:\s*/, '').replace(/\]$/, '');
            
            // console.log('Processing match:', { fullMatch, filename });
            
            try {
                const imageUrl = getImageUrl(filename);
                // console.log('Generated image URL:', imageUrl);
                // Build caption from long_desc if available
                const desc = imageDescriptions[filename];
                const caption = desc
                    ? `Figure: ${desc.slice(0, 100)}${desc.length > 100 ? '...' : ''}`
                    : 'Figure';
                // Replace with markdown image syntax using image URL
                const replacement = `![${caption}](${imageUrl})`;
                processedText = processedText.replace(fullMatch, replacement);
                // console.log('Replacement made:', { fullMatch, replacement });
            } catch (error) {
                if (process.env.NODE_ENV === 'development') {
                    console.error(`Error loading image ${filename}:`, error);
                }
                // Replace with error placeholder
                const replacement = `*[Image not available: ${filename}]*`;
                processedText = processedText.replace(fullMatch, replacement);
            }
        }
        
        // console.log('Final processed text:', processedText);
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
                const processedNarrativeTextPromise = processNarrativeWithImages(storyData.narrative || '');
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
        return structureId
            .split('_')
            .filter(Boolean)
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    };

    const formatStoryInstanceLabel = (structureId: string | undefined, index: number) => {
        const patternName = formatStoryStructureName(structureId) || 'Story';
        return truncateDropdownLabel(`${index}. ${patternName}`);
    };

    const headerPattern = formatStoryStructureName(storyData?.story_structure_id);
    const canGoBackInHistory = Boolean(selectedStory && selectedStory.historyIndex > 0);
    const canGoForwardInHistory = Boolean(selectedStory && selectedStory.historyIndex < selectedStory.history.length - 1);

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
        return url;
    };

    // Handle narrative button
    const handleNarrative = (e: React.MouseEvent) => {
        logAction(e);
        setNarrativeSelected(true)
        setStorySelected(false)
        setIsEditingContent(false);
    }

    const handleStory = (e: React.MouseEvent) => {
        logAction(e);
        setNarrativeSelected(false)
        setStorySelected(true)
        setIsEditingContent(false);

    }

    const handleHistoryBack = (e: React.MouseEvent) => {
        logAction(e);
        setStoryInstances((prev) => prev.map((instance, idx) => {
            if (idx !== selectedStoryIndex) return instance;
            if (instance.historyIndex <= 0) return instance;
            return {
                ...instance,
                historyIndex: instance.historyIndex - 1,
            };
        }));
        setIsEditingContent(false);
    };

    const handleHistoryForward = (e: React.MouseEvent) => {
        logAction(e);
        setStoryInstances((prev) => prev.map((instance, idx) => {
            if (idx !== selectedStoryIndex) return instance;
            if (instance.historyIndex >= instance.history.length - 1) return instance;
            return {
                ...instance,
                historyIndex: instance.historyIndex + 1,
            };
        }));
        setIsEditingContent(false);
    };

    const startEditing = () => {
        if (!storyData) return;
        setEditNarrative(storyData.narrative || '');
        setEditTheme(storyData.theme_response || '');
        setEditSequence(storyData.sequence_response || '');
        setIsEditingContent(true);
    };

    const handleContentDoubleClick = () => {
        startEditing();
    };

    const handleContentTouchEnd = () => {
        const now = Date.now();
        if (now - touchLastTapRef.current < 300) {
            startEditing();
            touchLastTapRef.current = 0;
            return;
        }
        touchLastTapRef.current = now;
    };

    const handleCancelEdit = () => {
        setIsEditingContent(false);
    };

    const persistStorySnapshot = async (
        instanceId: string,
        dataToPersist: StoryData,
        options?: { markAsPersisted?: boolean }
    ) => {
        setSaveLoading(true);
        setSaveError(null);
        try {
            const payload = storyDataToNarrativeCachePayload(dataToPersist);
            const result = await updateNarrativeCache(payload);
            if (result?.status === 'success') {
                const savedKey = storySnapshotKey(dataToPersist);
                setStoryInstances((prev) => prev.map((instance) => instance.id === instanceId
                    ? { ...instance, syncedKey: savedKey }
                    : instance
                ));
                if (options?.markAsPersisted) {
                    setPersistedStoryId(instanceId);
                }
                return true;
            }
            setSaveError(typeof result?.message === 'string' ? result.message : 'Save failed');
            return false;
        } catch (err) {
            setSaveError(err instanceof Error ? err.message : 'Save failed');
            return false;
        } finally {
            setSaveLoading(false);
        }
    };

    const handleApplyLocalEdit = (e: React.MouseEvent) => {
        logAction(e);
        if (!selectedStory || !storyData) return;
        const updated: StoryData = cloneStoryData(storyData);
        if (storySelected) {
            updated.narrative = editNarrative;
        } else {
            updated.theme_response = editTheme;
            updated.sequence_response = editSequence;
        }
        const shouldAutoPersistCurrentSaved = selectedStory.id === persistedStoryId;
        setStoryInstances((prev) => prev.map((instance, idx) => {
            if (idx !== selectedStoryIndex) return instance;
            const sliced = instance.history.slice(0, instance.historyIndex + 1);
            return {
                ...instance,
                history: [...sliced, updated],
                historyIndex: sliced.length,
            };
        }));
        setIsEditingContent(false);
        if (shouldAutoPersistCurrentSaved) {
            void persistStorySnapshot(selectedStory.id, updated, { markAsPersisted: true });
        }
    };

    const handleSaveStory = async (e: React.MouseEvent) => {
        logAction(e);
        if (!storyData || !selectedStory || saveLoading) return;
        await persistStorySnapshot(selectedStory.id, storyData, { markAsPersisted: true });
    };

    const storyDirty = Boolean(storyData && selectedStory && storySnapshotKey(storyData) !== selectedStory.syncedKey);
    const storyEditPanel = isEditingContent && storyData && storySelected && (
        <div className="p-4 rounded-lg border border-grey-dark/20 bg-white/70 mb-4">
            <h4 className="font-semibold text-grey-darkest mb-2">Edit Story</h4>
            <textarea
                value={editNarrative}
                onChange={(e) => setEditNarrative(e.target.value)}
                className="w-full min-h-40 rounded-md border border-grey-dark/20 p-2 text-sm mb-3"
            />
            <div className="mt-3 flex items-center gap-2">
                <button
                    type="button"
                    log-id="all-story-local-edit-apply"
                    onClick={handleApplyLocalEdit}
                    className="text-sm font-roboto-semibold px-2.5 py-1 rounded-md border border-grey-dark/30 text-grey-darkest hover:bg-white/60"
                >
                    Apply local edit
                </button>
                <button
                    type="button"
                    log-id="all-story-local-edit-cancel"
                    onClick={handleCancelEdit}
                    className="text-sm px-2.5 py-1 rounded-md border border-grey-dark/30 text-grey-darkest hover:bg-white/60"
                >
                    Cancel
                </button>
            </div>
        </div>
    );
    const reasoningEditPanel = isEditingContent && storyData && narrativeSelected && (
        <div className="p-4 rounded-lg border border-grey-dark/20 bg-white/70 mb-4">
            <h4 className="font-semibold text-grey-darkest mb-2">Edit Theme and Objective</h4>
            <textarea
                value={editTheme}
                onChange={(e) => setEditTheme(e.target.value)}
                className="w-full min-h-24 rounded-md border border-grey-dark/20 p-2 text-sm mb-3"
            />
            <h4 className="font-semibold text-grey-darkest mb-2">Edit Sequence Justification</h4>
            <textarea
                value={editSequence}
                onChange={(e) => setEditSequence(e.target.value)}
                className="w-full min-h-24 rounded-md border border-grey-dark/20 p-2 text-sm"
            />
            <div className="mt-3 flex items-center gap-2">
                <button
                    type="button"
                    log-id="reasoning-local-edit-apply"
                    onClick={handleApplyLocalEdit}
                    className="text-sm font-roboto-semibold px-2.5 py-1 rounded-md border border-grey-dark/30 text-grey-darkest hover:bg-white/60"
                >
                    Apply local edit
                </button>
                <button
                    type="button"
                    log-id="reasoning-local-edit-cancel"
                    onClick={handleCancelEdit}
                    className="text-sm px-2.5 py-1 rounded-md border border-grey-dark/30 text-grey-darkest hover:bg-white/60"
                >
                    Cancel
                </button>
            </div>
        </div>
    );

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
                <div id="data-stories-header-left" className="flex flex-wrap items-center gap-2 sm:gap-3">
                    <span className="bg-bama-crimson text-white text-lg font-roboto-semibold px-3 py-1.5 rounded-lg">Data Stories</span>
                    <ExportButton storyData={storyData} />
                    <div className="flex items-center gap-1 border-l border-grey-dark/20 pl-2 sm:pl-3 ml-0 sm:ml-1">
                        <select
                            id="story-instance-selector"
                            log-id="story-instance-selector"
                            className="text-sm rounded-md border border-grey-dark/30 bg-white px-2 py-1 text-grey-darkest"
                            value={selectedStoryIndex}
                            onChange={(e) => {
                                setSelectedStoryIndex(Number(e.target.value));
                                setIsEditingContent(false);
                            }}
                            disabled={storyInstances.length === 0}
                            title="Switch generated story"
                        >
                            {storyInstances.map((instance, idx) => (
                                <option key={instance.id} value={idx}>
                                    {instance.label}
                                </option>
                            ))}
                        </select>
                        <button
                            type="button"
                            log-id="data-stories-undo-button"
                            aria-label="Previous edit history entry"
                            disabled={!canGoBackInHistory}
                            onClick={handleHistoryBack}
                            className="p-1.5 rounded-md text-grey-darkest hover:bg-white/60 disabled:opacity-40 disabled:pointer-events-none"
                            title="Previous version"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>
                        <button
                            type="button"
                            log-id="data-stories-redo-button"
                            aria-label="Next edit history entry"
                            disabled={!canGoForwardInHistory}
                            onClick={handleHistoryForward}
                            className="p-1.5 rounded-md text-grey-darkest hover:bg-white/60 disabled:opacity-40 disabled:pointer-events-none"
                            title="Next version"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        </button>
                        <button
                            type="button"
                            log-id="data-stories-save-button"
                            aria-label="Save current story to server"
                            disabled={!storyData || !storyDirty || saveLoading}
                            onClick={handleSaveStory}
                            className="text-sm font-roboto-semibold px-2.5 py-1 rounded-md border border-grey-dark/30 text-grey-darkest hover:bg-white/60 disabled:opacity-40 disabled:pointer-events-none"
                            title={saveError || 'Save story to server'}
                        >
                            {saveLoading ? 'Saving…' : 'Save story'}
                        </button>
                    </div>
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
                    <div
                        className="w-full space-y-6"
                        onDoubleClick={handleContentDoubleClick}
                        onTouchEnd={handleContentTouchEnd}
                    >
                        <h3 className="text-xl font-semibold text-grey-darkest mb-4">Narrative Structure{headerPattern ? `: ${headerPattern}` : ''}</h3>
                        {reasoningEditPanel}
                        {isGenerating ? (
                            <GeneratingPlaceholder contentName="narrative analysis" lines={6} />
                        ) : isProcessingImages ? (
                            <GeneratingPlaceholder contentName="processing images" lines={4} />
                        ) : isEditingContent ? null : storyData ? (
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
                        {!isEditingContent && storyData && (
                            <p className="text-xs text-grey-dark mt-2">Double-click (or double-tap on touch) to edit reasoning.</p>
                        )}
                    </div>
                ) : (
                    // Generated Story Content (when storySelected is true)
                    <div
                        className="w-full"
                        onDoubleClick={handleContentDoubleClick}
                        onTouchEnd={handleContentTouchEnd}
                    >
                        <h3 className="text-xl font-semibold text-grey-darkest mb-4">Generated Story{headerPattern ? `: ${headerPattern}` : ''}</h3>
                        {storyEditPanel}
                        {isGenerating ? (
                            <GeneratingPlaceholder contentName="data story" lines={8} />
                        ) : isProcessingImages ? (
                            <GeneratingPlaceholder contentName="processing images" lines={4} />
                        ) : isEditingContent ? null : storyData?.narrative ? (
                            <div className="p-4 rounded-lg">
                                <div className="prose max-w-none text-grey-darkest leading-relaxed text-base">
                                    <ReactMarkdown
                                        components={markdownComponents}
                                        urlTransform={urlTransform}
                                        skipHtml={false}
                                    >
                                        {processedNarrative
                                            .replace(/^#{1,3}\s*(Introduction|Main Body|Conclusion)\s*:?\s*$/gim, '\n')
                                            .replace(/^\s*-?\s*\*\*(Introduction|Main Body|Conclusion)\*\*\s*:?\s*$/gim, '\n')
                                            .replace(/^\s*(Introduction|Main Body|Conclusion)\s*:?\s*$/gim, '\n')
                                        }
                                    </ReactMarkdown>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center text-grey-darkest mt-8">
                                <p>No story generated yet.</p>
                                <p className="text-sm mt-2">Click "Generate Story" to create your data story.</p>
                            </div>
                        )}
                        {!isEditingContent && storyData && (
                            <p className="text-xs text-grey-dark mt-2">Double-click (or double-tap on touch) to edit story text.</p>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}

export default DataStories;