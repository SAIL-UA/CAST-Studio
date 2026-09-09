// Import dependencies
import gs11 from '@/assets/images/gs1_1.png';
import gs12 from '@/assets/images/gs1_2.png';
import gs13 from '@/assets/images/gs1_3.png';
import gs14 from '@/assets/images/gs1_4.png';
import gs15 from '@/assets/images/gs1_5.png';
import gs16 from '@/assets/images/gs1_6.png';
import gs21 from '@/assets/images/gs2_1.png';
import gs22 from '@/assets/images/gs2_2.png';
import gs23 from '@/assets/images/gs2_3.png';
import gs24 from '@/assets/images/gs2_4.png';
import gs25 from '@/assets/images/gs2_5.png';
import gs26 from '@/assets/images/gs2_6.png';
import gs28 from '@/assets/images/gs2_8.png';
import gs29 from '@/assets/images/gs2_9.png';
import gs210 from '@/assets/images/gs2_10.png';
import gs31 from '@/assets/images/gs3_1.png';
import gs32 from '@/assets/images/gs3_2.png';
import gs33 from '@/assets/images/gs3_3.png';
import gs34 from '@/assets/images/gs3_4.png';
import gs41 from '@/assets/images/gs4_1.png';
import gs42 from '@/assets/images/gs4_2.png';
import gs43 from '@/assets/images/gs4_3.png';

import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom'

// Import compopnents
import LandingHeader, { SANS } from '@/components/LandingHeader';
import DocsSidebar, { type DocsMenuStructure } from '@/components/DocsSidebar';


// Visible component
const Tutorials = () => {

  const scroll_location = useLocation();
  const [activeSection, setActiveSection] = useState<string>('tutorial_one');

  useEffect(() => {
    if (scroll_location.state && scroll_location.state.targetId) {
      const element = document.getElementById(scroll_location.state.targetId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [scroll_location.state]); // Re-run if location.state changes

  // Scroll-spy: on each scroll, pick the section whose heading is the LAST one
  // above the trigger line. Handles bidirectional scrolling without dead zones
  // (an IntersectionObserver approach would leave the highlight stuck when the
  // user scrolls into a gap between adjacent sections).
  useEffect(() => {
    const ids = ['tutorial_one', 'tutorial_two', 'tutorial_three', 'tutorial_four'];
    const onScroll = () => {
      const triggerY = window.innerHeight * 0.3;
      let current = ids[0];
      for (const id of ids) {
        const el = document.getElementById(id);
        if (!el) continue;
        const rect = el.getBoundingClientRect();
        if (rect.top <= triggerY) {
          current = id;
        } else {
          break;
        }
      }
      setActiveSection(current);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll(); // initial call to set the right section on mount
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Docs menu structure — grouped for extensibility. Add another group (e.g. Deep Dive)
  // by appending to this array; the sidebar picks up new entries automatically.
  const DOCS_MENU: DocsMenuStructure = [
    {
      label: 'Getting Started',
      items: [
        { label: 'Gather Data',          targetId: 'tutorial_one'   },
        { label: 'Create Insights',      targetId: 'tutorial_two'   },
        { label: 'Structure Narratives', targetId: 'tutorial_three' },
        { label: 'Create Story',         targetId: 'tutorial_four'  },
      ],
    },
  ];

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

// Visible Component
  return (
    <div style={{ background: '#fff', color: '#0a0a0a', fontFamily: SANS, minHeight: '100vh', WebkitFontSmoothing: 'antialiased', MozOsxFontSmoothing: 'grayscale' } as any}>
    <LandingHeader active="docs" subtitle="Docs" />
    <div className="docs-layout">
      <aside className="docs-sidebar">
        <DocsSidebar menu={DOCS_MENU} activeId={activeSection} onSelect={scrollToSection} />
      </aside>
      <div id="middle-home" className="docs-main flex flex-col">
        <div className="w-full min-h-screen p-4">
          <br />
          <h1 className="text-2xl" id="tutorial_one">1. Getting Started</h1>
          <br />
          <h2 className="text-lg font-bold">1.1 Gather Data Visualizations</h2>
          <div className="rounded-lg p-8 md:p-12">
            <p className="text-lg text-grey-darkest leading-relaxed">
              Visit JupyterHub using https://cast-storystudio.com/jupyterhub and login with your account. If you do not have an account, register for a new one at https://cast-storystudio.com/.
            <br /><br />
            <img src={gs11} alt="gs11" className="w-1/3 h-1/3 object-contain ml-2" />
            <br />
            To create a server, type in a server name and click 'Add New Server'.
            <br /><br />
            <img src={gs12} alt="gs12" className="w-1/3 h-1/3 object-contain ml-2" />
            <br />
            Click a new iPython notebook in the launcher. Previously created notebooks will appear in the explorer tab on the left.
            <br /><br />
            <img src={gs13} alt="gs13" className="w-1/3 h-1/3 object-contain ml-2" />
            <br />
            Type your code, and run the blocks to create graphs. 
            <br /><br />
            <img src={gs14} alt="gs14" className="w-1/3 h-1/3 object-contain ml-2" />
            <br />
            In the top menu bar, click 'Save All Images' to save all graphs to Story Studio. If you wish to save a subset of images, click 'Save Image' to enter figure selection mode, and click on individual images to save them. Press Esc to exit figure selection mode.
            <br /><br />
            <img src={gs15} alt="gs15" className="w-1/3 h-1/3 object-contain ml-2" />
            <br />
            The selected figures will automatically appear in Story Studio for you to manipulate, group, and craft narratives and stories with assistance from AI. 
            <br /><br />
            <img src={gs16} alt="gs16" className="w-1/3 h-1/3 object-contain ml-2" />
            <br />
            You can also upload visuals directly from your computer by clicking 'Upload Visuals' in the StoryStudio Workspace.            
            </p>
          </div>
          
          <h2 className="text-lg font-bold" id="tutorial_two">1.2 Create Data Insights</h2>
          <div className="rounded-lg p-8 md:p-12">
            <p className="text-lg text-grey-darkest leading-relaxed">
              Click the 'Edit' button in the header of Visual 1 to reveal the edit menu.
            <br /><br />
            <img src={gs21} alt="gs11" className="w-1/3 h-1/3 object-contain ml-2" />
            <br />
            This menu allows you to write a short or long description for this visual, use AI to generate the long description, move it to the recycle bin, or permanently delete the visual. Click 'Generate Description' to use AI to caption the image.
            <br /><br />
            <img src={gs22} alt="gs12" className="w-1/3 h-1/3 object-contain ml-2" />
            <br />
            In a few seconds, you'll see an LLM-generated long description for the visual. Click 'Save and Close'. You can now use this description towards your final story.
            <br /><br />
            <img src={gs23} alt="gs13" className="w-1/3 h-1/3 object-contain ml-2" />
            <br />
            Go back to the workspace and click 'Group Visuals' to create an empty group. A group allows you to collect visuals you consider similar in content.
            <br /><br />
            <img src={gs24} alt="gs14" className="w-1/3 h-1/3 object-contain ml-2" />
            <br />
            Drag your existing visual into the group. You can now drag the group and its constituent images anywhere in the workspace.
            <br /><br />
            <img src={gs25} alt="gs15" className="w-1/3 h-1/3 object-contain ml-2" />
            <br />
            You can add up to three visuals in a group.
            <br /><br />
            <img src={gs26} alt="gs16" className="w-1/3 h-1/3 object-contain ml-2" />
            <br />
            Now click the 'Edit' icon in the top-right side of the group header. In this menu, you can add a name and description for this group.
            <br /><br />
            <img src={gs28} alt="gs16" className="w-1/3 h-1/3 object-contain ml-2" />
            <br />
            You can also edit the name of the group by clicking on it in the header directly. 
            <br /><br />
            <img src={gs29} alt="gs16" className="w-1/3 h-1/3 object-contain ml-2" />
            <br />
            Back in the Workspace, click 'Request Feedback'. In a few seconds, you'll see the feedback menu on the right hand side of the workspace. 
            <br /><br />
            <img src={gs210} alt="gs16" className="w-1/3 h-1/3 object-contain ml-2" />
            <br />
            This menu allows you to see actionable AI advice on key ways to improve your data insights, narratives, and stories.
            <br />
            </p>
          </div>

          
          <h2 className="text-lg font-bold" id="tutorial_three">1.3 Craft Narratives</h2>
          <div className="rounded-lg p-8 md:p-12">
            <p className="text-lg text-grey-darkest leading-relaxed">
            Hover over the 'Select Narratives' button to reveal manual and AI-assisted narrative selection options. Click 'Select Manually'.
            <br /><br />
            <img src={gs31} alt="gs11" className="w-1/3 h-1/3 object-contain ml-2" />
            <br />
            You'll see a 'Narrative Structures' menu on the right hand side of the Workspace. Click 'See Examples' under 'Cause and Effect'.
            <br /><br />
            <img src={gs32} alt="gs12" className="w-1/3 h-1/3 object-contain ml-2" />
            <br />
            This will give you a list of data-driven news stories with the primary narrative structure of 'cause and effect'. Click 'Back to Narrative Selection' and select 'Cause and Effect'.
            <br /><br />
            <img src={gs33} alt="gs13" className="w-1/3 h-1/3 object-contain ml-2" />
            <br />
            This will update the 'Narrative Selection' label to 'Cause and Effect'.
            <br /><br />
            <img src={gs34} alt="gs14" className="w-1/3 h-1/3 object-contain ml-2" />
            <br />
            Now, go ahead and click 'Generate Story'. 
            <br />
            </p>
          </div>

          
          <h2 className="text-lg font-bold" id="tutorial_four">1.4 Create Data Stories</h2>
          <div className="rounded-lg p-8 md:p-12">
            <p className="text-lg text-grey-darkest leading-relaxed">
            When you click 'Generate Story', the LLM is prompted to bring everything in your Workspace together, including visuals and groups, into a coherent and compelling story with a 'cause and effect' narrative structure.
            <br /><br />
            <img src={gs41} alt="gs11" className="w-1/3 h-1/3 object-contain ml-2" />
            <br />
            In a few seconds, the LLM reflects on the overall theme and connective tissue of these visuals and groups, and crafts both the final story and a detailed justification for the sequence of visuals in the story.
            <br /><br />
            <img src={gs42} alt="gs12" className="w-1/3 h-1/3 object-contain ml-2" />
            <br />
            Navigate to the 'Story' and 'Reasoning' tabs to view the final story and narrative structure justification, in that order. Click 'Export' to download a PDF.
            <br /><br />
            <img src={gs43} alt="gs13" className="w-1/3 h-1/3 object-contain ml-2" />
            <br />
</p>
          </div>

        </div>
      </div>
    </div>

    </div>
  );
};

export default Tutorials;
