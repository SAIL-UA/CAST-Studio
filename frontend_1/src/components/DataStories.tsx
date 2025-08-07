// Import dependencies
import { useState, useEffect } from 'react';

// Import components


// Workspace component
const DataStories = () => {

    // State
    const [narrativeSelected, setNarrativeSelected] = useState(true);
    const [storySelected, setStorySelected] = useState(false);

    // Effect
    useEffect(() => {
        setNarrativeSelected(true)
        setStorySelected(false)
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
            <div id="data-stories-header" className="flex h-1/5 w-full">
                <div id="data-stories-header-left" className="flex w-full h-full items-end justify-start">
                    <h2 className="text-3xl">Data Stories</h2>
                </div>
                <div id="data-stories-header-right" className="flex w-1/2 h-full items-end justify-end">
                    
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
            <div id="data-stories-content" className="flex w-full h-4/5 mt-4 bg-white">
                FILL WITH USER CONTENT HERE
            </div>
        </div>
    )
}

export default DataStories;