// Import dependencies
import { useState, useRef, useEffect, useCallback } from 'react';
import { generateDescription, getImageDataAll } from '../services/api';
import { logAction } from '../utils/userActionLogger';
import type { ImageData } from '../types/types';

const DESCRIPTION_PLACEHOLDER = 'Ask AI to create a description for this visual.';
const POLL_INTERVAL_MS = 2500;

type AnnotateVisualsButtonProps = {
  images: ImageData[];
  storyLoading?: boolean;
  onDescriptionsUpdated?: () => void | Promise<void>;
};

const AnnotateVisualsButton = ({ images, storyLoading = false, onDescriptionsUpdated }: AnnotateVisualsButtonProps) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [manualModalOpen, setManualModalOpen] = useState(false);
  const [aiRunning, setAiRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [totalToDescribe, setTotalToDescribe] = useState(0);
  const isDisabled = aiRunning || storyLoading;

  const buttonRef = useRef<HTMLButtonElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  // Clean up on unmount
  useEffect(() => {
    return () => stopPolling();
  }, [stopPolling]);

  const handleMouseEnter = () => {
    if (isDisabled) return;
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setMenuOpen(true);
  };

  const handleMouseLeave = () => {
    if (isDisabled) return;
    timeoutRef.current = setTimeout(() => {
      setMenuOpen(false);
    }, 150);
  };

  const handleCreateWithAI = async (e: React.MouseEvent) => {
    setMenuOpen(false);
    logAction(e, { annotate_mode: 'ai_descriptions' });

    // Fetch fresh image data from backend to avoid stale prop state
    let freshImages: ImageData[];
    try {
      const response = await getImageDataAll();
      freshImages = response.data.images;
    } catch (err) {
      console.error('Error fetching image data:', err);
      freshImages = images;
    }

    const activeImageSet = freshImages.filter((img: ImageData) => img.in_storyboard);
    if (activeImageSet.length === 0) {
      alert('Please add visuals to the storyboard before generating descriptions.');
      return;
    }

    // Count images that need descriptions
    const needsDescription = (img: ImageData) => {
      const desc = img.long_desc;
      return !desc || desc.trim() === '' || desc === DESCRIPTION_PLACEHOLDER;
    };
    const imagesToDescribe = activeImageSet.filter(needsDescription);
    let imagesToProcess = imagesToDescribe;

    if (imagesToDescribe.length === 0) {
      // All images already have descriptions — ask to redo
      const redo = window.confirm('They already have descriptions, redo all?');
      if (!redo) return;
      imagesToProcess = activeImageSet;
    }

    const total = imagesToProcess.length;
    setTotalToDescribe(total);
    setProgress(10);
    setAiRunning(true);

    // Fire all description tasks
    for (const image of imagesToProcess) {
      try {
        await generateDescription(image.id);
      } catch (err) {
        console.error('Error starting description generation for image', image.id, err);
      }
    }

    // Poll for completion
    pollRef.current = setInterval(async () => {
      try {
        const response = await getImageDataAll();
        const backendImages: ImageData[] = response.data.images;
        const storyboardImages = backendImages.filter((img: ImageData) => img.in_storyboard);

        // Count how many of the original set now have descriptions
        const describedCount = storyboardImages.filter((img: ImageData) => {
          const desc = img.long_desc;
          return desc && desc.trim() !== '' && desc !== DESCRIPTION_PLACEHOLDER;
        }).length;

        const totalStoryboard = storyboardImages.length;
        const rawPct = totalStoryboard > 0 ? Math.round((describedCount / totalStoryboard) * 100) : 0;
        setProgress(Math.max(10, rawPct));

        // Check if all are done (no more generating)
        const stillGenerating = storyboardImages.some((img: any) => img.long_desc_generating);
        if (!stillGenerating || rawPct >= 100) {
          stopPolling();
          setProgress(100);

          // Brief delay so the user sees 100% before reset
          setTimeout(async () => {
            setAiRunning(false);
            setProgress(0);
            if (onDescriptionsUpdated) {
              try {
                await onDescriptionsUpdated();
              } catch (err) {
                console.error('Error refreshing images after AI descriptions:', err);
              }
            }
          }, 500);
        }
      } catch (err) {
        console.error('Error polling for description progress:', err);
      }
    }, POLL_INTERVAL_MS);
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

  const baseColor = '#005c84'; // bama-crimson
  const fillColor = '#005c84';
  const bgColor = aiRunning ? '#005c8466' : baseColor;

  return (
    <>
      <div className="relative inline-block">
        <button
          ref={buttonRef}
          id="annotate-visuals-button"
          log-id="annotate-visuals-button"
          className="relative overflow-hidden flex items-center text-white text-sm rounded-t-2xl rounded-b-2xl px-3 py-1 mx-1 hover:-translate-y-[.05rem] hover:shadow-lg hover:brightness-95 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ backgroundColor: bgColor }}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          disabled={isDisabled}
        >
          {/* Progress fill */}
          {aiRunning && (
            <div
              className="absolute top-0 left-0 h-full transition-[width] duration-500 ease-out"
              style={{
                width: `${progress}%`,
                backgroundColor: fillColor,
              }}
            />
          )}
          {/* Invisible label for fixed width */}
          <span className="invisible whitespace-nowrap flex items-center gap-2">
            Annotate Visuals
            <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
              <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"></path>
            </svg>
          </span>
          {/* Visible centered content */}
          <span className="absolute inset-0 flex items-center justify-center z-10 gap-2">
            Annotate Visuals
            {!aiRunning && (
              <svg
                className={`fill-current h-4 w-4 transition-transform duration-300 ease-in ${
                  menuOpen ? 'rotate-180' : 'rotate-0'
                }`}
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
              >
                <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"></path>
              </svg>
            )}
          </span>
        </button>

        {menuOpen && !isDisabled && (
          <div
            className="absolute top-full z-[400] left-0 mt-1 shadow-lg bg-transparent overflow-hidden m-1"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            <button
              log-id="annotate-visuals-ai-option"
              className="block w-full bg-grey-lightest border-grey-light border-2 text-grey-darkest text-sm rounded-sm m-0 py-1 px-2 hover:-translate-y-[.05rem] hover:shadow-lg hover:brightness-95 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={handleCreateWithAI}
              disabled={isDisabled}
            >
              Create with AI
            </button>

            <button
              log-id="annotate-visuals-manual-option"
              className="block w-full bg-grey-lightest border-grey-light border-2 text-grey-darkest text-sm rounded-sm m-0 py-1 px-2 hover:-translate-y-[.05rem] hover:shadow-lg hover:brightness-95 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={handleCreateManually}
              disabled={isDisabled}
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
