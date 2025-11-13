// Import dependencies

// Import compopnents
import Header from '../components/Header';

// Visible component
const Construction = () => {
  return (
    <>
      <Header />
      <div className="min-h-screen bg-grey-lightest flex items-center justify-center px-4">
        <div className="max-w-2xl w-full text-center">
          <div className="bg-white rounded-lg shadow-lg p-8 md:p-12">
            <div className="mb-6">
              <div className="text-6xl mb-4">🚧</div>
              <h1 className="text-3xl md:text-4xl font-bold text-grey-darkest mb-4">
                Coming Soon
              </h1>
            </div>
            <p className="text-lg text-grey-darkest leading-relaxed">
              Our development team is actively working to bring you the next series of updates. Stay tuned. 
              Please reach out to our <a href="mailto:crerickson@crimson.ua.edu, thassan1@ua.edu" className="text-bama-crimson font-bold">development team</a> with any questions!
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default Construction;
