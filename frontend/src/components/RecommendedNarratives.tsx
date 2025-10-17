// Import dependencies


// Import components


// Import images
import recommendedNarrative from '../assets/images/workflow.png';


// Recommended narratives component
const RecommendedNarratives = () => {

    // Visible component
    return (
        <div id="recommended-narratives-container" className="flex flex-col w-full h-full ml-4">
            <div id="recommended-narratives-header" className="flex w-full h-1/5">
                <p className="text-sm font-regular text-gray-500">Recommended Narratives</p>
            </div>
            <div id="recommended-narratives-content" className="flex w-full h-4/5 mt-4">
                <img src={recommendedNarrative} alt="Recommended Narrative" className="w-1/3 max-h-[10vh] object-contain" />

                <div id="recommended-narratives-content-text" className="flex flex-col w-2/3 h-full">
                    
                    <p className='text-sm'>
                    Workflow or Process
                    </p>
                    <p className='text-xs'>
                    A series of steps documenting the unfolding of events in time from beginning to end.
                    </p>
                </div>
            </div>
        </div>
    )
}

export default RecommendedNarratives;