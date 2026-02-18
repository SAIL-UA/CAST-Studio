// Import dependencies
import { useState, useRef } from 'react';
import { generateDescription } from '../services/api';
import { logAction } from '../utils/userActionLogger';
import type { ImageData } from '../types/types';

type AnnotateVisualsButtonProps = {
  images: ImageData[];
  /**
   * Optional callback to refresh image data from the backend
   * after AI description generation completes.
   */
  onDescriptionsUpdated?: () => void | Promise<void>;
};

const AnnotateVisualsButton = ({ images, onDescriptionsUpdated }: AnnotateVisualsButtonProps) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [manualModalOpen, setManualModalOpen] = useState(false);
  const [aiRunning, setAiRunning] = useState(false);

  const buttonRef = useRef<HTMLButtonElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setMenuOpen(true);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setMenuOpen(false);
    }, 150);
  };

  const handleCreateWithAI = async (e: React.MouseEvent) => {
    setMenuOpen(false);
    logAction(e, { annotate_mode: 'ai_descriptions' });

    if (images.length === 0) {
      alert('All storyboard visuals already have descriptions.');
      return;
    }

    setAiRunning(true);
    try {
      for (const image of images) {
        try {
          await generateDescription(image.id);
        } catch (err) {
          console.error('Error starting description generation for image', image.id, err);
        }
      }
      alert(
        `Started AI description generation for ${images.length} visual${
          images.length > 1 ? 's' : ''
        }. Descriptions will appear as they finish.`
      );
    } finally {
      // Stop showing the loading state first
      setAiRunning(false);

      // Then optionally refresh image data from the backend
      if (onDescriptionsUpdated) {
        try {
          await onDescriptionsUpdated();
        } catch (err) {
          console.error('Error refreshing images after AI descriptions:', err);
        }
      }
    }
  };

  const handleCreateManually = (e: React.MouseEvent) => {
    setMenuOpen(false);
    logAction(e, { annotate_mode: 'manual' });
    setManualModalOpen(true);
  };

  const closeManualModal = (e?: React.MouseEvent) => {
    if (e) {
      logAction(e);
    }
    setManualModalOpen(false);
  };

  return (
    <>
      <div className="relative inline-block">
        <button
          ref={buttonRef}
          id="annotate-visuals-button"
          log-id="annotate-visuals-button"
          className="flex items-center bg-bama-crimson text-white text-sm rounded-t-2xl rounded-b-2xl px-3 py-1 mx-1 hover:-translate-y-[.05rem] hover:shadow-lg hover:brightness-95 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          disabled={aiRunning}
        >
          <span className="flex items-center justify-center gap-2">
            {aiRunning ? 'Annotating...' : 'Annotate Visuals'}
            <svg
              className={`fill-current h-4 w-4 transition-transform duration-300 ease-in ${
                menuOpen ? 'rotate-180' : 'rotate-0'
              }`}
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
            >
              <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"></path>
            </svg>
          </span>
        </button>

        {menuOpen && (
          <div
            className="absolute top-full z-[400] left-0 mt-1 shadow-lg bg-transparent overflow-hidden m-1"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            <button
              log-id="annotate-visuals-ai-option"
              className="block w-full bg-grey-lightest border-grey-light border-2 text-grey-darkest text-sm rounded-sm m-0 py-1 px-2 hover:-translate-y-[.05rem] hover:shadow-lg hover:brightness-95 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={handleCreateWithAI}
              disabled={aiRunning}
            >
              Create with AI
            </button>

            <button
              log-id="annotate-visuals-manual-option"
              className="block w-full bg-grey-lightest border-grey-light border-2 text-grey-darkest text-sm rounded-sm m-0 py-1 px-2 hover:-translate-y-[.05rem] hover:shadow-lg hover:brightness-95 transition duration-200"
              onClick={handleCreateManually}
            >
              Create Manually
            </button>
          </div>
        )}
      </div>

      {manualModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[500]">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Annotate Visuals Manually</h2>
              <button
                log-id="close-annotate-visuals-modal-button"
                onClick={closeManualModal}
                className="text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full p-2 transition-all duration-150"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4 text-sm text-grey-darkest">
              <p>
                Click the description boxes of a visual, or click{' '}
                <span className="font-semibold">Edit</span> in the top-right corner to annotate.
              </p>
            </div>

            <div className="mt-6 text-right">
              <button
                log-id="annotate-visuals-modal-close-button"
                onClick={closeManualModal}
                className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-150"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AnnotateVisualsButton;

