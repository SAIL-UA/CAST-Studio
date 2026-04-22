import React from 'react';
import squares from '../assets/images/squares.svg';

export type FeedbackCardData = {
  title: string;
  text: string;
  source?: string;
};

export type InstructorNote = {
  id: string;
  short_desc: string;
  long_desc: string;
  last_saved?: string;
};

interface FeedbackPanelProps {
  items: FeedbackCardData[];
  instructorNotes?: InstructorNote[];
  onClose?: () => void;
}

const FeedbackPanel: React.FC<FeedbackPanelProps> = ({ items, instructorNotes = [], onClose }) => {
  const hasContent = items.length > 0 || instructorNotes.length > 0;

  if (!hasContent) {
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
        <h3 className="text-sm text-gray-500 font-regular mb-2 mt-0">Feedback</h3>
      </div>

      <div className="space-y-3">
        {/* Instructor feedback notes — at the top */}
        {instructorNotes.map((note) => (
          <div key={note.id} className="bg-rose-50 rounded-md shadow-sm border border-grey-lightest overflow-hidden">
            {/* Title strip */}
            <div className="flex items-center gap-2 bg-red-400 text-white px-3 py-2">
              <h4 className="font-semibold text-sm">{note.short_desc || 'Instructor Feedback'}</h4>
            </div>

            {/* Body */}
            <div className="p-3">
              <p className="text-sm text-grey-darkest whitespace-pre-wrap">
                {note.long_desc || 'No feedback text yet.'}
              </p>

              {/* Badge and timestamp */}
              <div className="flex items-center gap-1.5 mt-3">
                <span className="inline-block text-xs font-medium text-white bg-red-400 rounded-full px-3 py-0.5">
                  Instructor
                </span>
                {note.last_saved && (
                  <span className="text-xs text-gray-400">
                    {new Date(note.last_saved).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}

        {/* AI feedback items — below */}
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
