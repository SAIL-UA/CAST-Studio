/**
 * CustomEvent names used to relay OpenAI streaming chunks from CraftStoryButton
 * (which owns the WebSocket lifecycle during generation) to whichever component
 * is rendering the story preview.
 *
 * Kept as a shared module so producer and consumer can't drift on strings.
 */

export const STORY_STREAM_START = 'storyStreamStart';
export const STORY_STREAM_CHUNK = 'storyStreamChunk';
export const STORY_STREAM_END = 'storyStreamEnd';
// Fired when the backend finishes patching reasoning fields (Reasoning tab data)
// into the cache — DataStories uses this to hydrate the Reasoning tab a beat
// after the story is already visible in the Story tab.
export const STORY_REASONING_READY = 'storyReasoningReady';
// Fired by CraftStoryButton whenever the useTaskProgress stage label changes,
// so DataStories can annotate the "AI is writing" placeholder with the current
// stage ("Theming", "Sequencing", etc.) — gives the user visible motion rather
// than staring at the same string for 6–8 seconds.
export const STORY_GENERATION_STAGE = 'storyGenerationStage';

export interface StoryStreamChunkDetail {
    delta: string;
}

export interface StoryReasoningDetail {
    sequence_summary?: { label: string; why: string }[];
    rq_reasoning?: { label: string; how_informed: string }[];
}

export interface StoryGenerationStageDetail {
    stageName: string;
}
