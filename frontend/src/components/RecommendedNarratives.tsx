// Import dependencies


// Import components


// Import images
import recommendedNarrative from '../assets/images/read-02.jpg';


// Recommended narratives component
const RecommendedNarratives = () => {

    // Visible component
    return (
        <div id="recommended-narratives-container" className="flex flex-col w-full h-full">
            <div id="recommended-narratives-header" className="flex w-full h-1/5">
                <h3>Recommended Narratives For You</h3>
            </div>

            <div id="recommended-narratives-content" className="flex w-full h-4/5">
                <img src={recommendedNarrative} alt="Recommended Narrative" className="w-1/3 max-h-[10vh] object-contain" />

                <div id="recommended-narratives-content-text" className="flex flex-col w-2/3 h-full">
                    <h3 className='font-semibold'>
                    Workflow or Process
                    </h3>
                    <p className='text-sm'>
                    A series of steps documenting the unfolding of events in time from beginning to end.
                    </p>
                </div>
            </div>
        </div>
    )
}

export default RecommendedNarratives;