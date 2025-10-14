// Import dependencies
import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { getNarrativeCache, serveImage } from '../services/api';
import { GeneratingPlaceholder } from './GeneratingPlaceholder';

// Story data interface
interface StoryData {
    narrative?: string;
    recommended_order?: string[];
    categorize_figures_response?: string;
    theme_response?: string;
    sequence_response?: string;
}

interface DataStoriesProps {
    selectedPattern: string;
}

// DataStories component
const DataStories = ({ selectedPattern }: DataStoriesProps) => {

    // State
    const [narrativeSelected, setNarrativeSelected] = useState(true);
    const [storySelected, setStorySelected] = useState(false);
    const [storyData, setStoryData] = useState<StoryData | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [processedNarrative, setProcessedNarrative] = useState<string>('');
    const [processedTheme, setProcessedTheme] = useState<string>('');
    const [processedCategories, setProcessedCategories] = useState<string>('');
    const [processedSequence, setProcessedSequence] = useState<string>('');
    const [isProcessingImages, setIsProcessingImages] = useState(false);
    const [processedRecommended, setProcessedRecommended] = useState<string[]>([]);

    // Check for existing cached narrative on component mount
    const loadCachedNarrative = async () => {
        try {
            const response = await getNarrativeCache();
            if (response.data && response.data.data) {
                const cacheData = response.data.data;
                setStoryData({
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

    
    // Effect
    useEffect(() => {
        setNarrativeSelected(true)
        setStorySelected(false)

        // Check for cached narrative and load it (if it exists) on mount
        loadCachedNarrative();

        // Listen for story generation events
        const handleStoryGenerated = (event: Event) => {
            const customEvent = event as CustomEvent;
            const data = customEvent.detail;
            setIsGenerating(false);
            console.log('Story data received:', data);
            
            // Story data already has processed figures from GenerateStoryButton
            setStoryData(data);
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
        };
    }, [])


    // Process narrative text to replace [FIGURE: filename] with blob URLs
    const processNarrativeWithImages = async (text: string): Promise<string> => {
        if (!text) return text;
        
        // Find all figure placeholders
        const figurePattern = /\[FIGURE:\s*([^\]]+)\]/g;
        const matches: RegExpExecArray[] = [];
        let match;
        while ((match = figurePattern.exec(text)) !== null) {
            matches.push(match);
        }
        
        if (matches.length === 0) return text;
        
        let processedText = text;
        
        // Process each figure placeholder
        for (const match of matches) {
            const fullMatch = match[0];
            const filename = match[1].trim();
            
            try {
                // Get blob URL for the image
                const blobUrl = await serveImage(filename);
                if (blobUrl) {
                    // Replace with markdown image syntax using blob URL
                    const replacement = `![Figure](${blobUrl})`;
                    processedText = processedText.replace(fullMatch, replacement);
                } else {
                    // If image fails to load, show a placeholder
                    const replacement = `Image not available: ${filename}`;
                    processedText = processedText.replace(fullMatch, replacement);
                }
            } catch (error) {
                console.error(`Error loading image ${filename}:`, error);
                // Replace with error placeholder
                const replacement = `Image not available: ${filename}`;
                processedText = processedText.replace(fullMatch, replacement);
            }
        }
        
        return processedText;
    };

    // Process all narrative content when storyData changes
    useEffect(() => {
        const processAllContent = async () => {
            if (!storyData) {
                setProcessedNarrative('');
                setProcessedTheme('');
                setProcessedCategories('');
                setProcessedSequence('');
                setProcessedRecommended([]);
                return;
            }

            setIsProcessingImages(true);
            
            try {
                const processedNarrativeTextPromise = processNarrativeWithImages(storyData.narrative || '');
                const processedThemeTextPromise = processNarrativeWithImages(storyData.theme_response || '');
                const processedCategoriesTextPromise = processNarrativeWithImages(storyData.categorize_figures_response || '');
                const processedSequenceTextPromise = processNarrativeWithImages(storyData.sequence_response || '');

                const recommendedList = storyData.recommended_order || [];
                const processedRecommendedPromises = recommendedList.map((filename) =>
                    processNarrativeWithImages(filename)
                );

                const [
                    processedNarrativeText,
                    processedThemeText,
                    processedCategoriesText,
                    processedSequenceText,
                    processedRecommendedList
                ] = await Promise.all([
                    processedNarrativeTextPromise,
                    processedThemeTextPromise,
                    processedCategoriesTextPromise,
                    processedSequenceTextPromise,
                    Promise.all(processedRecommendedPromises)
                ]);

                setProcessedNarrative(processedNarrativeText);
                setProcessedTheme(processedThemeText);
                setProcessedCategories(processedCategoriesText);
                setProcessedSequence(processedSequenceText);
                setProcessedRecommended(processedRecommendedList);
            } catch (error) {
                console.error('Error processing images:', error);
            } finally {
                setIsProcessingImages(false);
            }
        };

        processAllContent();
    }, [storyData]);

    // Unified image components for all ReactMarkdown sections
    const imageComponents = {
        img: ({node, ...props}: any) => {
            console.log('ReactMarkdown img component received props:', props);
            console.log('Image src:', props.src);
            
            return (
                <div className="my-6 flex flex-col items-center justify-center w-full h-[35dvh]">
                    <img
                        {...props}
                        className="w-auto h-full object-contain rounded-md shadow-sm m-0 p-0"
                        onLoad={() => console.log('Image loaded successfully:', props.src)}
                        onError={(e) => {
                            console.error('Image failed to load:', props.src, e);
                            console.log('Image error target:', e.target);
                        }}
                    />
                    <p className="text-sm text-grey-dark mt-2 italic">
                        {props.alt || 'Figure'}
                    </p>
                </div>
            );
        }
    };

    // URL transform function for all sections
    const urlTransform = (url: string) => {
        console.log('URL transform called with:', url);
        return url;
    };

    // Handle narrative button
    const handleNarrative = () => {
        setNarrativeSelected(true)
        setStorySelected(false)
    }

    const handleStory = () => {
        setNarrativeSelected(false)
        setStorySelected(true)

    }

    // Visible component
    return (
        <div id="data-stories-container" className="flex flex-col w-full h-full">
            {/* Header */}
            <div id="data-stories-header" className="flex w-full">
                <div id="data-stories-header-left" className="flex w-full h-full items-end justify-start">
                    <h3 className="text-2xl">Data Stories</h3>
                </div>
                <div id="data-stories-header-right" className="flex w-1/2 h-full items-end justify-end text-sm">
                    
                    <button id="narrative-button"
                    className={`underline-animate ${narrativeSelected ? 'active' : ''} mx-3`}
                    onClick={handleNarrative}
                    >
                    Narrative
                    </button>

                    <button id="story-button"
                    className={`underline-animate ${storySelected ? 'active' : ''} mx-3`}
                    onClick={handleStory}>
                    Story
                    </button>
                </div>
            </div>

            {/* Content */}
            <div id="data-stories-content" className="flex w-full flex-1 mt-4 bg-white rounded-sm p-4 overflow-y-auto min-h-0">
                {narrativeSelected ? (
                    // Narrative Structuring Content
                    <div className="w-full space-y-6">
                        <h3 className="text-xl font-semibold text-grey-darkest mb-4">Narrative Structuring{selectedPattern ? `: ${selectedPattern.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}` : ''}</h3>
                        
                        {isGenerating ? (
                            <GeneratingPlaceholder contentName="narrative analysis" lines={6} />
                        ) : isProcessingImages ? (
                            <GeneratingPlaceholder contentName="processing images" lines={4} />
                        ) : storyData ? (
                            <>
                                {/* Theme and Objective */}
                                {storyData.theme_response && (
                                    <div className="bg-grey-lightest p-4 rounded-lg">
                                        <h4 className="font-semibold text-grey-darkest mb-2">Theme & Objective</h4>
                                        <div className="text-grey-darkest whitespace-pre-wrap">
                                            <ReactMarkdown 
                                                components={imageComponents}
                                                urlTransform={urlTransform}
                                                skipHtml={false}
                                            >
                                                {processedTheme}
                                            </ReactMarkdown>
                                        </div>
                                    </div>
                                )}

                                {/* Figure Categories */}
                                {storyData.categorize_figures_response && (
                                    <div className="bg-grey-lightest p-4 rounded-lg">
                                        <h4 className="font-semibold text-grey-darkest mb-2">Figure Categories</h4>
                                        <div className="text-grey-darkest whitespace-pre-wrap">
                                            <ReactMarkdown 
                                                components={imageComponents}
                                                urlTransform={urlTransform}
                                                skipHtml={false}
                                            >
                                                {processedCategories}
                                            </ReactMarkdown>
                                        </div>
                                    </div>
                                )}

                                {/* Sequence Justification */}
                                {storyData.sequence_response && (
                                    <div className="bg-grey-lightest p-4 rounded-lg">
                                        <h4 className="font-semibold text-grey-darkest mb-2">Sequence Justification</h4>
                                        <div className="text-grey-darkest whitespace-pre-wrap">
                                            <ReactMarkdown 
                                                components={imageComponents}
                                                urlTransform={urlTransform}
                                                skipHtml={false}
                                            >
                                                {processedSequence}
                                            </ReactMarkdown>
                                        </div>
                                    </div>
                                )}

                                {/* Recommended Order */}
                                {processedRecommended && processedRecommended.length > 0 && (
                                    <div className="bg-grey-lightest p-4 rounded-lg">
                                        <h4 className="font-semibold text-grey-darkest mb-2">Recommended Figure Order</h4>
                                        <ol className="list-decimal list-inside text-grey-darkest">
                                            {processedRecommended.map((md, index) => (
                                                <li key={index} className="mb-4">
                                                    <ReactMarkdown 
                                                        components={imageComponents}
                                                        urlTransform={urlTransform}
                                                        skipHtml={false}
                                                    >
                                                        {md}
                                                    </ReactMarkdown>
                                                </li>
                                            ))}
                                        </ol>
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="text-center text-grey-darkest mt-8">
                                <p>No narrative structuring data available.</p>
                                <p className="text-sm mt-2">Click "Generate Story" to create narrative insights.</p>
                            </div>
                        )}
                    </div>
                ) : (
                    // Generated Story Content (when storySelected is true)
                    <div className="w-full">
                        <h3 className="text-xl font-semibold text-grey-darkest mb-4">Generated Story{selectedPattern ? `: ${selectedPattern.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}` : ''}</h3>
                        
                        {isGenerating ? (
                            <GeneratingPlaceholder contentName="data story" lines={8} />
                        ) : isProcessingImages ? (
                            <GeneratingPlaceholder contentName="processing images" lines={4} />
                        ) : storyData?.narrative ? (
                            <div className="bg-white p-4 rounded-lg border border-grey-lightest">
                                <div className="prose max-w-none text-grey-darkest leading-relaxed text-base">
                                    <ReactMarkdown
                                        components={imageComponents}
                                        urlTransform={urlTransform}
                                        skipHtml={false}
                                    >
                                        {processedNarrative}
                                    </ReactMarkdown>
                                </div>
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