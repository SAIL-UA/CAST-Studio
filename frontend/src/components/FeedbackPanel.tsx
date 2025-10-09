import React from 'react';
import WidgetIcon from '../assets/images/squares.svg';

type FeedbackEntry = {
  text: string;
  source: string; // e.g., 'Instructor' or 'Story Studio AI'
};

type FeedbackCardData = {
  title: string;
  entries: FeedbackEntry[];
};

type FeedbackPanelProps = {
  items: FeedbackCardData[];
  onClose?: () => void;
};

const Badge: React.FC<{ label: string }> = ({ label }) => (
  <span
    className="inline-block text-white text-xs rounded-md px-3 py-1 mt-2"
    style={{ backgroundColor: '#be6d6d' }}
  >
    {label}
  </span>
);

const FeedbackCard: React.FC<{ item: FeedbackCardData }> = ({ item }) => (
  <div className="bg-white rounded-lg shadow-sm border border-grey-lightest overflow-hidden mb-4">
    {/* Card header (mimics group/item header styling) */}
    <div
      className="flex items-center text-white px-3 py-2"
      style={{ backgroundColor: '#4d8497' }}
    >
      {/* Simple icon placeholder */}
  <img src={WidgetIcon} alt="Feedback item" className="mr-2 w-4 h-4 shrink-0" />
      <h4 className="text-sm font-bold truncate">{item.title}</h4>
    </div>

    {/* Card body with text entries */}
    <div className="p-4 space-y-4">
      {item.entries.map((entry, idx) => (
        <div key={idx} className="text-grey-darkest">
          <p className="text-sm leading-relaxed">{entry.text}</p>
          <Badge label={entry.source} />
        </div>
      ))}
    </div>
  </div>
);

const FeedbackPanel: React.FC<FeedbackPanelProps> = ({ items, onClose }) => {
  return (
  <div className="w-full h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 flex-shrink-0">
        <h3 className="text-xl font-semibold text-grey-darkest">Feedback</h3>
        {onClose && (
          <button
            className="text-grey-dark hover:text-grey-darkest rounded-full w-6 h-6 flex items-center justify-center hover:bg-grey-lightest"
            onClick={onClose}
            title="Close"
          >
            ×
          </button>
        )}
      </div>

      {/* Cards occupy remaining vertical space and scroll only if truly overflowing overall sidebar */}
      <div className="flex-1 pr-1">
        {items.map((item, idx) => (
          <FeedbackCard key={idx} item={item} />
        ))}
      </div>
    </div>
  );
};

export type { FeedbackCardData };
export default FeedbackPanel;
