// Import dependencies
import React from 'react';

// Visible component
const Construction = () => {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-2xl w-full text-center">
        <div className="bg-white rounded-lg shadow-lg p-8 md:p-12">
          <div className="mb-6">
            <div className="text-6xl mb-4">🚧</div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Under Construction
            </h1>
          </div>
          <p className="text-lg text-gray-600 leading-relaxed">
            Our development team is actively making changes and pushing code to production. 
            Please reach out to our <a href="mailto:crerickson@crimson.ua.edu, thassan1@ua.edu" className="text-bama-crimson font-bold">development team</a> with any questions!
          </p>
        </div>
      </div>
    </div>
  );
};

export default Construction;
