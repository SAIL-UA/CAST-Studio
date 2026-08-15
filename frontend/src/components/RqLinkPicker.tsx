import React, { useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import { useResearchQuestions } from '../contexts/ResearchQuestions';

interface RqLinkPickerProps {
  /** ImageData id for visuals/notes, GroupData id for groups. */
  cardId: string;
  isGroup?: boolean;
  /** Classes for the trigger button so it matches the host's other header buttons. */
  buttonClassName: string;
  /** Icon size in px — cards use tiny buttons, groups slightly larger. */
  iconSize?: number;
}

/**
 * Link/unlink research questions directly from a card header, so you don't have to open the
 * RQ panel to attach a visual.
 *
 * Rendered through a portal with fixed positioning: the card wrapper sets `overflow-hidden`,
 * which would clip an absolutely positioned dropdown.
 */
const RqLinkPicker: React.FC<RqLinkPickerProps> = ({
  cardId,
  isGroup = false,
  buttonClassName,
  iconSize = 8,
}) => {
  const { questions, toggleCardLink } = useResearchQuestions();
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const linkedCount = questions.filter((rq) =>
    (isGroup ? rq.groups : rq.images).includes(cardId),
  ).length;

  const handleOpen = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (open) {
      setOpen(false);
      return;
    }
    const rect = buttonRef.current?.getBoundingClientRect();
    if (rect) {
      // Keep the 224px-wide panel on screen when the card sits near the right edge.
      const left = Math.min(rect.left, window.innerWidth - 236);
      setCoords({ top: rect.bottom + 4, left: Math.max(8, left) });
    }
    setOpen(true);
  };

  return (
    <>
      <button
        ref={buttonRef}
        log-id={isGroup ? 'group-rq-link-button' : 'visual-rq-link-button'}
        onClick={handleOpen}
        onMouseDown={(e) => e.stopPropagation()}  // don't start a drag
        className={buttonClassName}
        title={linkedCount > 0 ? `Linked to ${linkedCount} research question(s)` : 'Link a research question'}
      >
        <svg
          width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth={2.5} strokeLinecap="round"
          style={{ transform: 'scaleX(-1)' }}
        >
          <path d="M10 13a5 5 0 007 0l3-3a5 5 0 00-7-7l-1 1" />
          <path d="M14 11a5 5 0 00-7 0l-3 3a5 5 0 007 7l1-1" />
        </svg>
      </button>

      {open && coords && ReactDOM.createPortal(
        <>
          {/* Click-away backdrop */}
          <div
            className="fixed inset-0 z-[450]"
            onClick={(e) => { e.stopPropagation(); setOpen(false); }}
            onMouseDown={(e) => e.stopPropagation()}
          />
          <div
            className="fixed z-[460] w-56 max-h-64 overflow-y-auto bg-white rounded-md shadow-2xl border border-grey-light p-2"
            style={{ top: coords.top, left: coords.left }}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <p className="text-xs text-grey-dark mb-1.5">Link research questions</p>
            {questions.length === 0 ? (
              <p className="text-xs text-grey-dark py-1">
                No research questions yet. Add one in the Research Questions panel.
              </p>
            ) : (
              questions.map((rq) => {
                const linked = (isGroup ? rq.groups : rq.images).includes(cardId);
                return (
                  <label
                    key={rq.id}
                    className="flex items-start gap-2 py-1 px-1 text-xs text-grey-darkest cursor-pointer hover:bg-grey-lighter rounded"
                  >
                    <input
                      type="checkbox"
                      checked={linked}
                      onChange={() => toggleCardLink(rq.id, cardId, isGroup)}
                      className="accent-bama-crimson mt-0.5 flex-shrink-0"
                    />
                    <span className="font-semibold flex-shrink-0">{rq.label}</span>
                    <span className="truncate" title={rq.text}>{rq.text}</span>
                  </label>
                );
              })
            )}
          </div>
        </>,
        document.body,
      )}
    </>
  );
};

export default RqLinkPicker;
