// Import dependencies
import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';

// Story data interface
interface StoryData {
    narrative?: string;
    recommended_order?: string[];
    categorize_figures_response?: string;
    theme_response?: string;
    sequence_response?: string;
}

// DataStories component
const DataStories = () => {

    // State
    const [narrativeSelected, setNarrativeSelected] = useState(true);
    const [storySelected, setStorySelected] = useState(false);
    const [storyData, setStoryData] = useState<StoryData | null>(null);

    // Effect
    useEffect(() => {
        setNarrativeSelected(true)
        setStorySelected(false)

        // Listen for story generation events
        const handleStoryGenerated = (event: CustomEvent) => {
            setStoryData(event.detail);
            console.log('Story data received:', event.detail);
        };

        window.addEventListener('storyGenerated', handleStoryGenerated as EventListener);

        // Cleanup
        return () => {
            window.removeEventListener('storyGenerated', handleStoryGenerated as EventListener);
        };
    }, [])

    // Handle narrative button
    const handleNarrative = () => {
        setNarrativeSelected(true)
        setStorySelected(false)

        // Send request to backend here
    }

    const handleStory = () => {
        setNarrativeSelected(false)
        setStorySelected(true)

        // Send request to backend here
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
                        <h3 className="text-xl font-semibold text-grey-darkest mb-4">Narrative Structuring</h3>
                        
                        {storyData ? (
                            <>
                                {/* Theme and Objective */}
                                {storyData.theme_response && (
                                    <div className="bg-grey-lightest p-4 rounded-lg">
                                        <h4 className="font-semibold text-grey-darkest mb-2">Theme & Objective</h4>
                                        <div className="text-grey-darkest whitespace-pre-wrap">
                                            <ReactMarkdown>{storyData.theme_response}</ReactMarkdown>
                                        </div>
                                    </div>
                                )}

                                {/* Figure Categories */}
                                {storyData.categorize_figures_response && (
                                    <div className="bg-grey-lightest p-4 rounded-lg">
                                        <h4 className="font-semibold text-grey-darkest mb-2">Figure Categories</h4>
                                        <div className="text-grey-darkest whitespace-pre-wrap">
                                            <ReactMarkdown>{storyData.categorize_figures_response}</ReactMarkdown>
                                        </div>
                                    </div>
                                )}

                                {/* Sequence Justification */}
                                {storyData.sequence_response && (
                                    <div className="bg-grey-lightest p-4 rounded-lg">
                                        <h4 className="font-semibold text-grey-darkest mb-2">Sequence Justification</h4>
                                        <div className="text-grey-darkest whitespace-pre-wrap">
                                            <ReactMarkdown>{storyData.sequence_response}</ReactMarkdown>
                                        </div>
                                    </div>
                                )}

                                {/* Recommended Order */}
                                {storyData.recommended_order && storyData.recommended_order.length > 0 && (
                                    <div className="bg-grey-lightest p-4 rounded-lg">
                                        <h4 className="font-semibold text-grey-darkest mb-2">Recommended Figure Order</h4>
                                        <ol className="list-decimal list-inside text-grey-darkest">
                                            {storyData.recommended_order.map((filename, index) => (
                                                <li key={index} className="mb-1"><ReactMarkdown>{filename}</ReactMarkdown></li>
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
                        <h3 className="text-xl font-semibold text-grey-darkest mb-4">Generated Story</h3>
                        
                        {storyData?.narrative ? (
                            <div className="bg-white p-4 rounded-lg border border-grey-lightest">
                                <div className="prose max-w-none text-grey-darkest whitespace-pre-wrap leading-relaxed text-base">
                                    <ReactMarkdown>{storyData.narrative}</ReactMarkdown>
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