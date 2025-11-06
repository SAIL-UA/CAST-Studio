// Import dependencies
import React, { useEffect, useState } from 'react';
import { logAction } from '../utils/userActionLogger';

// Import components

// Import images
import Brutus from '../assets/images/brutus.jpg';
import Casa from '../assets/images/casa.jpg'
import Fresas from '../assets/images/fresas.jpg'
import Popeye from '../assets/images/popeye.jpg'
import Super from '../assets/images/super.jpg'
import { log } from 'console';

// Define props interface
type NarrativeExamplesProps = {
    selectedPattern: string;
    setRightNarrativeExamplesOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

// Narrative Examples Component
const NarrativeExamples = ({ selectedPattern, setRightNarrativeExamplesOpen }: NarrativeExamplesProps) => {

    // States
    const [content, setContent] = useState<{ title: string, domain: string, link: string, image: string }[]>([]);

    // Handle Exit
    const handleExit = (e: React.MouseEvent) => {
        logAction(e, { narrative_pattern: selectedPattern });
        setRightNarrativeExamplesOpen(false);
    }

    const handleNarrativeLinkClick = (e: React.MouseEvent, item: any) => {
        logAction(e, { 
            narrative_pattern: selectedPattern, 
            narrative_example: item.title, 
            narrative_example_link: item.link 
        });
        window.open(item.link, '_blank')
        
    }
    useEffect(() => {
        // Determine what content to display on mount
        if (selectedPattern === 'cause_and_effect') {
            setContent([
                {
                    "title": "How a shipping error more than a century ago ...",
                    "domain": "History",
                    "link": "https://www.vox.com/future-perfect/2023/2/10/23589333/cecile-steele-chicken-meat-poultry-eggs-delaware",
                    "image": Casa
                },
                {
                    "title": "Where New York’s Asian Neighborhoods",
                    "domain": "Politics",
                    "link": "https://www.nytimes.com/interactive/2023/03/05/nyregion/election-asians-voting-republicans-nyc.html?unlocked_article_code=1.H00.sCuW.kYOa0R8-Sn6X",
                    "image": Casa
                },
                {
                    "title": "The true death toll of COVID-19",
                    "domain": "Health",
                    "link": "https://www.who.int/data/stories/the-true-death-toll-of-covid-19-estimating-global-excess-mortality",
                    "image": Casa
                },
                {
                    "title": "What's really warming up the world?",
                    "domain": "Climate",
                    "link": "https://www.bloomberg.com/graphics/2015-whats-warming-the-world/?leadSource=uverify%20wall",
                    "image": Casa
                }
            ]);
        } else if (selectedPattern === 'question_answer') {
            setContent([
                {
                    "title": "How much does America spend?",
                    "domain": "Economy",
                    "link": "https://www.nytimes.com/2025/03/31/briefing/us-federal-government-spending-doge.html",
                    "image": Fresas
                },
                {
                    "title": "What Africa will look like in 100 years",
                    "domain": "Global Affairs",
                    "link": "https://s.telegraph.co.uk/graphics/projects/Africa-in-100-years/index.html",
                    "image": Fresas
                },
                {
                    "title": "Egg prices have quadrupled...",
                    "domain": "Economy",
                    "link": "https://www.theguardian.com/business/datablog/2025/mar/22/egg-prices-us-inflation-cost",
                    "image": Fresas
                },
                {
                    "title": "What is the problem with car tariffs?",
                    "domain": "Economy",
                    "link": "https://www.nytimes.com/interactive/2025/03/04/business/economy/car-tariffs.html",
                    "image": Fresas
                },
                {
                    "title": "How much snow will give kids a snow day?",
                    "domain": "Weather",
                    "link": "https://www.cnn.com/2024/02/12/us/how-much-snow-kids-school-snow-day-across-us-dg/index.html",
                    "image": Fresas
                },
                {
                    "title": "Spain General Election Results",
                    "domain": "Politics",
                    "link": "https://www.nytimes.com/interactive/2023/07/23/world/europe/results-spain-election.html?unlocked_article_code=1.H00.nQ8N.LaJGavK9_jlv",
                    "image": Fresas
                },
                {
                    "title": "Why are so many American pedestrians dying?",
                    "domain": "Economy",
                    "link": "https://www.nytimes.com/interactive/2023/12/11/upshot/nighttime-deaths.html?unlocked_article_code=1.H00.AxIr.mNYxUnJy7BKx",
                    "image": Fresas
                },
                {
                    "title": "Africa’s vulnerability to global shocks",
                    "domain": "Global Affairs",
                    "link": "https://unctad.org/news/africas-vulnerability-global-shocks-highlights-need-stronger-regional-trade",
                    "image": Fresas
                }
            ]);
        } else if (selectedPattern === 'time_based') {
            setContent([
                {
                    "title": "Sleep schedule, from the Inconsistent Teenage Years to Retirement",
                    "domain": "Health",
                    "link": "https://flowingdata.com/2019/09/13/sleep-schedule-and-age/",
                    "image": Super
                },
                {
                    "title": "COVID-19 pandemic timeline",
                    "domain": "Health",
                    "link": "https://shorthand.radionz.co.nz/coronavirus-timeline/index.html",
                    "image": Super
                },
                {
                    "title": "The green divide",
                    "domain": "Environment",
                    "link": "https://interactives.stuff.co.nz/2022/03/urban-heat-island-tree-cover/",
                    "image": Super
                }
            ]);
        } else if (selectedPattern === 'factor_analysis') {
            setContent([]);
        } else if (selectedPattern === 'overview_to_detail') {
            setContent([
                {
                    "title": "The housing search is easing ...",
                    "domain": "Economy",
                    "link": "https://www.nbcnews.com/data-graphics/buy-house-us-easier-cost-economy-trump-tariffs-trade-war-rcna198066",
                    "image": Popeye
                },
                {
                    "title": "Americans broadly favor support services",
                    "domain": "Policy",
                    "link": "https://www.newamerica.org/education-policy/edcentral/americans-broadly-favor-the-support-services-that-help-students-succeed/",
                    "image": Popeye
                },
                {
                    "title": "A third of Americans are already facing above-average warming..",
                    "domain": "Environment",
                    "link": "https://www.theguardian.com/environment/2022/feb/05/americans-above-average-temperature-increase-climate-crisis",
                    "image": Popeye
                },
                {
                    "title": "How Electricity Is Changing, Country by Country",
                    "domain": "Economy",
                    "link": "https://www.nytimes.com/interactive/2023/11/20/climate/global-power-electricity-fossil-fuels-coal.html?unlocked_article_code=1.H00.lsuj.5PvhFWCYQOSa",
                    "image": Popeye
                },
                {
                    "title": "Using open data to shape humanitarian action",
                    "domain": "Global Affairs",
                    "link": "https://data.europa.eu/en/publications/datastories/using-open-data-shape-humanitarian-action",
                    "image": Popeye
                }
            ]);
        } else if (selectedPattern === 'problem_solution') {
            setContent([
                {
                    "title": "Increasing enrollment",
                    "domain": "Policy",
                    "link": "https://www.newamerica.org/education-policy/briefs/increasing-enrollment-successful-strategies-from-three-community-colleges/",
                    "image": Brutus
                },
                {
                    "title": "Equity before adequacy",
                    "domain": "Policy",
                    "link": "https://www.newamerica.org/education-policy/briefs/equity-before-adequacy-in-higher-education-funding/",
                    "image": Brutus
                },
                {
                    "title": "The world's copper stronghold",
                    "domain": "Global Affairs",
                    "link": "https://features.csis.org/copper-in-latin-america/",
                    "image": Brutus
                },
                {
                    "title": "The Social and Educational Consequences of Adolescent Childbearing",
                    "domain": "Gender",
                    "link": "https://genderdata.worldbank.org/en/data-stories/adolescent-fertility",
                    "image": Brutus
                }
            ]);
        } else if (selectedPattern === 'comparative') {
            setContent([
                {
                    "title": "America’s Surprising Partisan Divide on Life Expectancy",
                    "domain": "Life/Personal",
                    "link": "https://www.politico.com/news/magazine/2023/09/01/america-life-expectancy-regions-00113369",
                    "image": Fresas
                },
                {
                    "title": "Mapping the marketplace: Insights into EU trade",
                    "domain": "Economy",
                    "link": "https://data.europa.eu/en/publications/datastories/mapping-marketplace-insights-eu-trade",
                    "image": Fresas
                },
                {
                    "title": "India’s states are in a battle for fair representation in parliament. Here’s why.",
                    "domain": "Global Affairs",
                    "link": "https://www.reuters.com/graphics/INDIA-POLITICS/STATES/zjvqawdolvx/",
                    "image": Fresas
                }
            ]);
        } else if (selectedPattern === 'workflow_process') {
            setContent([]);
        } else if (selectedPattern === 'shock_lead') {
            setContent([
                {
                    "title": "Cheaper mortgeaes and car loans",
                    "domain": "Economy",
                    "link": "https://www.nytimes.com/interactive/2024/09/18/business/economy/mortgages-car-loans-interest-rates.html",
                    "image": Popeye
                },
                {
                    "title": "A tinderbox conflict in Congo is ready to explode",
                    "domain": "Politics",
                    "link": "https://www.reuters.com/graphics/CONGO-SECURITY/MAPS/movaykzaava/",
                    "image": Popeye
                }
            ]);
        }
    }, [selectedPattern]);


    return (
        <div id="narrative-examples" className="p-0 m-0">
            {/* Narrative Examples Header */}
            <div className="flex flex-col w-full m-0 p-0">
                <div
                log-id="narrative-examples-back-button"
                className="flex flex-row items-center justify-start w-full cursor-pointer"
                onClick={handleExit}

                >
                    <div className="flex flex-shrink-0 p-0 m-0">
                        <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="w-4 h-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                        </svg>
                    </div>
                    <div className="flex flex-1 p-2 m-0">
                        <h4 className="text-sm roboto-medium text-indigo-dark">Back to Narrative Selection</h4>
                    </div>
                </div>

                <h3 className={`text-lg font-roboto-light w-full p-2 text-grey-darkest`}>Examples: {selectedPattern ? `${selectedPattern.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}` : ''}</h3>
            </div>

            {/* Narrative Examples Content */}
            <div className="flex flex-col w-full">
                {content.length > 0 ? (
                    content.map((item, index) => (
                        <div key={index} className="flex flex-row h-full bg-sky-lighter p-2 items-center hover:bg-grey-light">
                            {/* Left Image */}
                            <div className="w-1/4 h-3/4 object-cover pr-1">
                                <img src={item.image} alt={item.title} className="w-full h-full object-cover ml-2" />
                            </div>
                            {/* Right Content */}
                            <div className="w-3/4 h-auto pl-4">
                                <h4 className="text-sm font-bold text-grey-darkest">{item.title}</h4>
                                <div className="flex flex-col items-start justify-start w-full">
                                    <h4 className="text-xs roboto-medium text-grey-darkest py-1">{item.domain}</h4>
                                    <button
                                    log-id="narrative-examples-visit-button"
                                    className="bg-indigo-lighter rounded-full px-3 py-1 hover:-translate-y-[.05rem] hover:shadow-lg hover:brightness-95 transition duration-200"
                                    onClick={(e) => handleNarrativeLinkClick(e, item)}
                                    >
                                        <p className="text-xs font-roboto-light">Visit</p>
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="flex justify-center items-center p-8">
                        <p className="text-xs roboto-light text-grey-dark">No examples to show currently</p>
                    </div>
                )}
            </div>




        </div>
    )
}

// Export component
export default NarrativeExamples;