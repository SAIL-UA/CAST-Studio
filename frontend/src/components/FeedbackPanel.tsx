import React from 'react';
import squares from '../assets/images/squares.svg';

export type FeedbackCardData = {
  title: string;
  text: string;
  source?: string;
};

interface FeedbackPanelProps {
  items: FeedbackCardData[];
  onClose?: () => void;
}

const FeedbackPanel: React.FC<FeedbackPanelProps> = ({ items, onClose }) => {
  if (!items || items.length === 0) {
    return (
      <div className="w-full p-4 text-grey-darkest">
        <p>No feedback yet.</p>
      </div>
    );
  }

  return (
    <div className="w-full p-3">
      {/* Panel header */}
      <div className="flex flex-row w-full">
        <h3 className="text-lg mb-2 mt-4 w-3/4 ml-2">Feedback</h3>
        {onClose && (
          <div className="flex items-center justify-end w-1/4">
            <svg
              className="w-6 h-6 cursor-pointer"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              onClick={onClose}
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
        )}
      </div>

      <div className="space-y-3">
      {items.map((it: FeedbackCardData, idx: number) => (
        <div key={idx} className="bg-white rounded-md shadow-sm border border-grey-lightest overflow-hidden">
          {/* Integrated title strip as part of card */}
          <div className="flex items-center gap-2 bg-[#4d8497] text-white px-3 py-2">
            <img src={squares} alt="section" className="w-4 h-4 opacity-90" />
            <h4 className="font-semibold text-sm">{it.title || 'Feedback'}</h4>
          </div>

          {/* Body */}
          <div className="p-3">
            <p className="text-sm text-grey-darkest whitespace-pre-wrap">{it.text}</p>

            {/* Source badge at bottom */}
            <div className="mt-3">
              <span className="inline-block text-xs font-medium text-white bg-[#be6d6d] rounded-full px-3 py-1">
                {it.source || 'Story Studio AI'}
              </span>
            </div>
          </div>
        </div>
      ))}
      </div>
    </div>
  );
};

export default FeedbackPanel;
