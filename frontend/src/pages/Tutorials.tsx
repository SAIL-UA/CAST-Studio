// Import dependencies
import gs11 from '../assets/images/gs1_1.png';
import gs12 from '../assets/images/gs1_2.png';
import gs13 from '../assets/images/gs1_3.png';
import gs14 from '../assets/images/gs1_4.png';
import gs15 from '../assets/images/gs1_5.png';
import gs16 from '../assets/images/gs1_6.png';

import { useEffect, useState } from 'react';

// Import compopnents
import Header from '../components/Header';
import Footer from '../components/Footer';
import NavDropdown from '../components/NavDropdown';


// Visible component
const Tutorials = () => {

//States
  const [centerNarrativePatternsOpen, setCenterNarrativePatternsOpen] = useState(false);
  const [rightNarrativePatternsOpen, setRightNarrativePatternsOpen] = useState(false);

// Visible Component
  return (
    <>
    <Header />
    <div id="home-container" className="flex w-full font-roboto-light">
        
        {/* Left Home */}
        <div id="left-home" className="w-1/5 px-3 max-xl:hidden">
            <div id="nav-dropdown" className="ml-2">
                <NavDropdown setCenterNarrativePatternsOpen={setCenterNarrativePatternsOpen} />
            </div>

            <div id="footer" className="flex flex-col justify-start items-start">
                <Footer />

            </div>
        
        </div>
      <div id="middle-home" className="w-4/5 max-xl:w-full px-4 flex flex-col border-l border-1 border-grey-light">
        <div className="w-full min-h-screen p-4">
          <br />
          <h1 className="text-2xl">Getting Started</h1>
          <br />
          <h2 className="text-lg">1.1 Gather Data Visualizations</h2>
          <div className="rounded-lg p-8 md:p-12">
            <p className="text-lg text-grey-darkest leading-relaxed">
              Visit JupyterHub using https://cast-storystudio.com/jupyterhub and login with your account. If you do not have account, register for a new one at https://cast-storystudio.com/.
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
            </p>
          </div>
          <br />
          <div className="rounded-lg shadow-lg p-8 md:p-12">
            <div className="mb-6">
              <h1 className="text-xl font-bold text-grey-darkest mb-4">
                Step 2: Create data insights.
              </h1>
            </div>
            <p className="text-sm text-grey-darkest leading-relaxed">
              Tutorials go here.
            </p>
          </div>
          <br />
          <div className="rounded-lg shadow-lg p-8 md:p-12">
            <div className="mb-6">
              <h1 className="text-xl font-bold text-grey-darkest mb-4">
                Step 3: Structure the narrative.
              </h1>
            </div>
            <p className="text-sm text-grey-darkest leading-relaxed">
              Tutorials go here.
            </p>
          </div>
          <br />
          <div className="rounded-lg shadow-lg p-8 md:p-12">
            <div className="mb-6">
              <h1 className="text-xl font-bold text-grey-darkest mb-4">
                Step 4: Create data story.
              </h1>
            </div>
            <p className="text-sm text-grey-darkest leading-relaxed">
              Tutorials go here.
            </p>
          </div>

      </div>
      </div>
    </div>

    </>
  );
};

export default Tutorials;
