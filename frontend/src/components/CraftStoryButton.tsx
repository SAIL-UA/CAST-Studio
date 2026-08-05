// Import dependencies
import { useState, useEffect, useRef } from 'react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { captureActionContext, logAction } from '../utils/userActionLogger';
import { generateNarrativeAsync, getImageDataAll, getNarrativeCache } from '../services/api';
import { useTaskProgress } from '../hooks/useTaskProgress';
import { SCAFFOLD_NUMBER_TO_PATTERN } from '../types/scaffoldMappings';
import { getStoryUserEdited, setStoryUserEdited, STORY_EDIT_STATE_EVENT } from '../utils/storyEditState';

// Import types
import { ImageData, ScaffoldData } from '../types/types';
const DESCRIPTION_PLACEHOLDER = 'Ask AI to create a description for this visual.';

// Props interface
type CraftStoryButtonProps = {
    images?: ImageData[];
    storyLoading: boolean;
    setStoryLoading: React.Dispatch<React.SetStateAction<boolean>>;
    hasGroups?: boolean;
    selectedPattern: string;
    onStoryGenerated?: () => Promise<void>;
    slotOrder?: number[] | null;
    scaffolds?: ScaffoldData[];
    /** Workspace owner when acting on someone else's workspace (session control). */
    targetUser?: string;
}

// Craft Story button component
const CraftStoryButton = ({ images = [], storyLoading, setStoryLoading, hasGroups = false, selectedPattern, onStoryGenerated, slotOrder, scaffolds = [], targetUser }: CraftStoryButtonProps) => {

    const [taskId, setTaskId] = useState<string | null>(null);
    const [alertModal, setAlertModal] = useState<string | null>(null);
    const [confirmModal, setConfirmModal] = useState<string | null>(null);
    const [pendingGeneration, setPendingGeneration] = useState<(() => void) | null>(null);
    const targetScaffoldIdRef = useRef<string | null>(null);
    const { progress, stageName, error, isComplete } = useTaskProgress(taskId);

    // Whether this workspace has saved manual edits that regeneration would destroy.
    const [hasUserEdits, setHasUserEdits] = useState(() => getStoryUserEdited(targetUser));
    useEffect(() => {
        setHasUserEdits(getStoryUserEdited(targetUser));
        const handleEditStateChange = (e: Event) => {
            const detail = (e as CustomEvent).detail;
            // Ignore edits made to a different workspace than the one this button targets.
            if ((detail?.workspaceOwner || undefined) !== targetUser) return;
            setHasUserEdits(Boolean(detail?.edited));
        };
        window.addEventListener(STORY_EDIT_STATE_EVENT, handleEditStateChange);
        return () => window.removeEventListener(STORY_EDIT_STATE_EVENT, handleEditStateChange);
    }, [targetUser]);

    // Listen for scaffold-specific story generation events (from play buttons on scaffolds)
    useEffect(() => {
        const handleGenerateEvent = (e: Event) => {
            const scaffoldId = (e as CustomEvent).detail?.scaffoldId;
            if (scaffoldId && !storyLoading) {
                targetScaffoldIdRef.current = scaffoldId;
                // Create a synthetic mouse event to pass to handleCraft
                const syntheticEvent = { preventDefault: () => {}, currentTarget: document.getElementById('craft-story-button') } as any;
                handleCraft(syntheticEvent);
            }
        };
        window.addEventListener('generateScaffoldStory', handleGenerateEvent);
        return () => window.removeEventListener('generateScaffoldStory', handleGenerateEvent);
        // hasUserEdits included so the scaffold play-button path sees the current flag and
        // shows the same overwrite warning as the main button.
    }, [storyLoading, images, scaffolds, selectedPattern, hasGroups, slotOrder, hasUserEdits]);

    // Handle error from progress tracking
    if (error && storyLoading) {
        setAlertModal(`Story generation failed during: ${stageName}\n\n${error}`);
        setStoryLoading(false);
        setTaskId(null);
    }

    // Handle craft — warn about destroying saved edits first, then run the normal checks.
    const handleCraft = async (e: React.MouseEvent) => {
        const ctx = captureActionContext(e);

        if (hasUserEdits) {
            setConfirmModal('Generating a new story will replace the story you edited, and your edits cannot be recovered. Continue?');
            setPendingGeneration(() => () => {
                // Clear this prompt before validation, which may raise its own.
                setConfirmModal(null);
                setPendingGeneration(null);
                runValidationAndGenerate(ctx);
            });
            return;
        }

        runValidationAndGenerate(ctx);
    };

    const runValidationAndGenerate = async (ctx: any) => {
        // --- Categorize storyboard items ---
        const storyboardItems = images.filter(img => img.in_storyboard && img.source !== 'instructor');
        const actualImages = storyboardItems.filter(img => img.filepath && img.filepath !== '');
        const stickyNotes = storyboardItems.filter(img => !img.filepath || img.filepath === '');

        const hasValidDescription = (img: ImageData) => {
            return img.long_desc && img.long_desc.trim() !== '' && img.long_desc !== DESCRIPTION_PLACEHOLDER;
        };
        const hasContent = (img: ImageData) => {
            // Sticky note has content if long_desc has text OR title was changed from default "Note N"
            if (hasValidDescription(img)) return true;
            const defaultTitlePattern = /^Note \d+$/;
            return img.short_desc && !defaultTitlePattern.test(img.short_desc);
        };

        const annotatedImages = actualImages.filter(img => hasValidDescription(img));
        const unannotatedImages = actualImages.filter(img => !hasValidDescription(img));
        const contentNotes = stickyNotes.filter(img => hasContent(img));

        const scaffoldId = targetScaffoldIdRef.current;

        if (scaffoldId) {
            // --- Scaffold-specific validation ---
            const scaffoldItems = storyboardItems.filter(img => img.scaffoldId === scaffoldId);
            if (scaffoldItems.length === 0) {
                setAlertModal('Add visuals to the scaffold to continue.');
                return;
            }

            const scaffoldImages = scaffoldItems.filter(img => img.filepath && img.filepath !== '');
            const scaffoldAnnotated = scaffoldImages.filter(img => hasValidDescription(img));
            const scaffoldUnannotated = scaffoldImages.filter(img => !hasValidDescription(img));

            if (scaffoldAnnotated.length === 0) {
                setAlertModal('Before generating a story, please:\n\n• Add at least one annotated visual to the scaffold');
                return;
            }

            if (scaffoldUnannotated.length > 0) {
                setConfirmModal(`${scaffoldUnannotated.length} image(s) in this scaffold don't have descriptions and will be excluded. Continue?`);
                setPendingGeneration(() => () => startGeneration(ctx));
                return;
            }
        } else {
            // --- Workspace-wide validation ---
            const missing: string[] = [];

            if (annotatedImages.length === 0) {
                missing.push('Upload visuals to the workspace and annotate them');
            }

            if (!selectedPattern || selectedPattern === '') {
                missing.push('Select a narrative structure (with AI or manually)');
            }

            if (missing.length > 0) {
                setAlertModal('Before generating a story, please:\n\n' + missing.map(m => `• ${m}`).join('\n'));
                return;
            }

            if (unannotatedImages.length > 0) {
                setConfirmModal(`${unannotatedImages.length} image(s) don't have descriptions and will be excluded from the story. Continue?`);
                setPendingGeneration(() => () => startGeneration(ctx));
                return;
            }
        }

        // All checks passed — generate
        startGeneration(ctx);
    };

    const startGeneration = async (ctx: any) => {
        setConfirmModal(null);
        setPendingGeneration(null);

        // Generate story with selected pattern
        setStoryLoading(true);

        // Dispatch event to indicate story generation has started
        const startEvent = new CustomEvent('storyGenerationStarted');
        window.dispatchEvent(startEvent);

        try {
            // Verify backend state before story generation
            console.log('Verifying backend state...');
            try {
                const response = await getImageDataAll();
                const backendImages = response.data.images;
                const readyImages = backendImages.filter((img: any) => img.in_storyboard && img.long_desc && img.long_desc.trim());
                console.log(`Images ready for story generation: ${readyImages.length}/${backendImages.length}`);
            } catch (error) {
                console.error('Error verifying backend state:', error);
            }

            // Generate the story (async with polling)
            // Determine the story structure and scaffold for the selected target
            const scaffoldId = targetScaffoldIdRef.current;
            let storyStructureId: string | undefined;
            let scaffoldSlotOrder = slotOrder || undefined;
            if (scaffoldId && scaffolds.length > 0) {
                // Specific scaffold — use its structure type
                const targetScaffold = scaffolds.find(s => s.id === scaffoldId);
                if (targetScaffold) {
                    storyStructureId = SCAFFOLD_NUMBER_TO_PATTERN[targetScaffold.number] || selectedPattern || undefined;
                }
            } else if (!scaffoldId && scaffolds.length > 0) {
                // All workspace with scaffolds — don't filter by structure type
                storyStructureId = undefined;
            } else {
                // No scaffolds — use selected pattern
                storyStructureId = selectedPattern || undefined;
            }
            const taskResponse = await generateNarrativeAsync(storyStructureId, hasGroups, scaffoldSlotOrder, scaffoldId || undefined);

            if (taskResponse.status === 'success' && taskResponse.task_id) {
                // Start progress tracking
                setTaskId(taskResponse.task_id);

                // Store initial narrative to detect when new one is generated
                let initialNarrative = '';
                try {
                    const initialResponse = await getNarrativeCache();
                    if (initialResponse.data && initialResponse.data.data) {
                        initialNarrative = initialResponse.data.data.narrative || '';
                    }
                } catch (error) {
                    console.log('No initial narrative found');
                }

                // Poll for task completion via narrative cache
                const pollForCompletion = async () => {
                    const maxAttempts = 192; // 8 minutes with 2.5-second intervals
                    let attempts = 0;

                    while (attempts < maxAttempts) {
                        attempts++;

                        try {
                            const cacheResponse = await getNarrativeCache();
                            const cacheData = cacheResponse.data.data;

                            if (cacheData.narrative && cacheData.narrative !== initialNarrative) {
                                if (onStoryGenerated) {
                                    try {
                                        await onStoryGenerated();
                                    } catch (refreshError) {
                                        console.error('Error refreshing image data after story generation:', refreshError);
                                    }
                                }

                                const storyEvent = new CustomEvent('storyGenerated', {
                                    detail: {
                                        story_structure_id: cacheData.story_structure_id,
                                        narrative: cacheData.narrative,
                                        recommended_order: cacheData.order,
                                        categorize_figures_response: cacheData.categories,
                                        theme_response: cacheData.theme,
                                        sequence_response: cacheData.sequence_justification
                                    }
                                });
                                window.dispatchEvent(storyEvent);

                                console.log('New story generated successfully');
                                // The row now holds fresh AI output, so prior edits are gone.
                                setStoryUserEdited(false, targetUser);
                                setStoryLoading(false);
                                setTaskId(null);
                                logAction(ctx, { "story_data": cacheData })
                                return;
                            }
                        } catch (error) {
                            console.error('Error polling for story completion:', error);
                        }

                        await new Promise(resolve => setTimeout(resolve, 2500));
                    }

                    // Timeout reached
                    console.error('Story generation timed out');
                    setAlertModal('Story generation is taking longer than expected. Please check back in a few minutes.');
                    setStoryLoading(false);
                    setTaskId(null);
                };

                pollForCompletion();

            } else {
                console.error('Error starting story generation:', taskResponse.message);
                setAlertModal(`Error starting story generation: ${taskResponse.message}`);
                setStoryLoading(false);
            }
        } catch (error) {
            console.error('Error generating story:', error);
            setAlertModal('An error occurred while generating the story. Please try again.');
            setStoryLoading(false);
        }

    }

    // Build scaffold options for dropdown
    const scaffoldOptions = scaffolds.map((s, idx) => ({
        id: s.id,
        label: `${SCAFFOLD_NUMBER_TO_PATTERN[s.number]?.split('_').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') || `Scaffold ${idx + 1}`}`,
        number: s.number,
    }));

    // Visible component
    return (
        <>
            {scaffolds.length > 0 ? (
                <DropdownMenu.Root>
                    <DropdownMenu.Trigger asChild disabled={storyLoading}>
                        <button
                            id="craft-story-button"
                            log-id="craft-story-button"
                            data-tour-target="story"
                            className="relative overflow-hidden flex items-center text-white text-sm rounded-t-2xl rounded-b-2xl px-3 py-1 mx-1 hover:-translate-y-[.05rem] hover:shadow-lg hover:brightness-95 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                            style={{ backgroundColor: storyLoading ? '#348b9466' : '#348b94' }}
                            disabled={storyLoading}
                        >
                            {storyLoading && (
                                <div className="absolute top-0 left-0 h-full transition-[width] duration-500 ease-out" style={{ width: `${progress}%`, backgroundColor: '#348b94' }} />
                            )}
                            <span className="invisible whitespace-nowrap flex items-center gap-2"><svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor"><path d="M4 2.5v11l9-5.5z"/></svg>Generate Story <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"></path></svg></span>
                            <span className="absolute inset-0 flex items-center justify-center z-10 gap-2">
                                <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor"><path d="M4 2.5v11l9-5.5z"/></svg>
                                {storyLoading ? (stageName || 'Generating...') : 'Generate Story'}
                                {!storyLoading && <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"></path></svg>}
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
                                className="block w-full text-left text-sm text-grey-darkest px-3 py-1.5 hover:bg-grey-lighter cursor-pointer outline-none"
                                onSelect={(e) => { targetScaffoldIdRef.current = null; handleCraft(e as any); }}
                            >
                                All workspace
                            </DropdownMenu.Item>
                            <div className="h-px mx-3 bg-grey" />
                            {scaffoldOptions.map((opt, idx) => (
                                <DropdownMenu.Item
                                    key={opt.id}
                                    className="block w-full text-left text-sm text-grey-darkest px-3 py-1.5 hover:bg-grey-lighter cursor-pointer outline-none"
                                    onSelect={(e) => { targetScaffoldIdRef.current = opt.id; handleCraft(e as any); }}
                                >
                                    {idx + 1}. {opt.label}
                                </DropdownMenu.Item>
                            ))}
                        </DropdownMenu.Content>
                    </DropdownMenu.Portal>
                </DropdownMenu.Root>
            ) : (
                <button
                    id="craft-story-button"
                    log-id="craft-story-button"
                    data-tour-target="story"
                    className="relative overflow-hidden flex items-center text-white text-sm rounded-t-2xl rounded-b-2xl px-3 py-1 mx-1 hover:-translate-y-[.05rem] hover:shadow-lg hover:brightness-95 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ backgroundColor: storyLoading ? '#348b9466' : '#348b94' }}
                    disabled={storyLoading}
                    onClick={handleCraft}
                >
                    {storyLoading && (
                        <div className="absolute top-0 left-0 h-full transition-[width] duration-500 ease-out" style={{ width: `${progress}%`, backgroundColor: '#348b94' }} />
                    )}
                    <span className="invisible whitespace-nowrap flex items-center gap-2"><svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor"><path d="M4 2.5v11l9-5.5z"/></svg>Generate Story</span>
                    <span className="absolute inset-0 flex items-center justify-center z-10 gap-2">
                        <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor"><path d="M4 2.5v11l9-5.5z"/></svg>
                        {storyLoading ? (stageName || 'Generating...') : 'Generate Story'}
                    </span>
                </button>
            )}

            {alertModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[500]">
                    <div className="bg-white rounded-lg p-6 w-full max-w-lg mx-4">
                        <div className="text-sm text-grey-darkest whitespace-pre-wrap">
                            {alertModal}
                        </div>
                        <div className="mt-6 text-right">
                            <button
                                log-id="craft-story-alert-ok-button"
                                onClick={() => setAlertModal(null)}
                                className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-150"
                            >
                                OK
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {confirmModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[500]">
                    <div className="bg-white rounded-lg p-6 w-full max-w-sm mx-4">
                        <div className="text-sm text-grey-darkest">
                            {confirmModal}
                        </div>
                        <div className="flex justify-end gap-2 mt-6">
                            <button
                                onClick={() => { setConfirmModal(null); setPendingGeneration(null); }}
                                className="text-sm px-4 py-1.5 rounded border hover:bg-grey-lighter transition"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => { if (pendingGeneration) pendingGeneration(); }}
                                className="text-sm bg-bama-crimson text-white rounded px-4 py-1.5 hover:brightness-95 transition"
                            >
                                Continue
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}

export default CraftStoryButton;
