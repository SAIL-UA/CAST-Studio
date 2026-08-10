import React, { useCallback, useEffect, useState } from 'react';
import squares from '../assets/images/squares.svg';
import { useResearchQuestions } from '../contexts/ResearchQuestions';
import {
  getResearchQuestions,
  createResearchQuestion,
  updateResearchQuestion,
  deleteResearchQuestion,
  updateResearchQuestionLinks,
} from '../services/api';

export type ResearchQuestion = {
  id: string;
  text: string;
  order: number;
  images: string[];
  groups: string[];
};

/** A workspace card the panel can link to. Visuals and notes are both ImageData. */
export type LinkableCard = {
  id: string;
  label: string;
  kind: 'visual' | 'note' | 'group';
};

interface ResearchQuestionsPanelProps {
  /** Workspace cards available to link. Supplied by the page so the panel stays presentational. */
  cards?: LinkableCard[];
  /** Set when viewing someone else's workspace in a collaborate session. */
  targetUser?: string;
  /** Hides every mutating control; the backend enforces this independently. */
  readOnly?: boolean;
  /**
   * Notifies the page that questions or their links changed, so the shared context refreshes.
   * Fired on add / edit / delete / link-toggle — the card badges and the card link dropdowns
   * both read from that context, so skipping it leaves them stale until a page reload.
   */
  onLinksChanged?: () => void;
}

const KIND_LABEL: Record<LinkableCard['kind'], string> = {
  visual: 'Visual',
  note: 'Note',
  group: 'Group',
};

const ResearchQuestionsPanel: React.FC<ResearchQuestionsPanelProps> = ({
  cards = [],
  targetUser,
  readOnly = false,
  onLinksChanged,
}) => {
  const [questions, setQuestions] = useState<ResearchQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [linkingId, setLinkingId] = useState<string | null>(null);
  const [showComposer, setShowComposer] = useState(false);
  const { questions: ctxQuestions } = useResearchQuestions();

  // With no questions yet the textbox stays open, since an empty panel needs an obvious entry point.
  const composerOpen = showComposer || questions.length === 0;

  const load = useCallback(async () => {
    try {
      const data = await getResearchQuestions(targetUser);
      setQuestions(data || []);
      setError(null);
    } catch (e) {
      setError('Could not load research questions.');
    } finally {
      setLoading(false);
    }
  }, [targetUser]);

  useEffect(() => {
    load();
  }, [load]);

  // Links can also change from a card's link button. Following the context's link signature
  // keeps this panel's checkboxes and counts in step with those edits.
  const ctxLinkSignature = JSON.stringify(
    ctxQuestions.map((q) => [q.id, q.images.length, q.groups.length]),
  );
  useEffect(() => {
    if (ctxQuestions.length > 0) {
      load();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctxLinkSignature]);

  const handleAdd = async () => {
    const text = draft.trim();
    if (!text) return;
    try {
      await createResearchQuestion({ text }, targetUser);
      setDraft('');
      setShowComposer(false);
      await load();
      // Tell the context too, otherwise the new question is missing from the card link
      // dropdowns until a page refresh.
      onLinksChanged?.();
    } catch (e) {
      setError('Could not save the question.');
    }
  };

  const handleSaveEdit = async (id: string) => {
    const text = editingText.trim();
    if (!text) return;
    try {
      await updateResearchQuestion(id, { text }, targetUser);
      setEditingId(null);
      await load();
      // Edited text is shown in the card link dropdowns, so refresh those too.
      onLinksChanged?.();
    } catch (e) {
      setError('Could not update the question.');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteResearchQuestion(id, targetUser);
      await load();
      onLinksChanged?.();
    } catch (e) {
      setError('Could not delete the question.');
    }
  };

  /** Toggling a checkbox sends the whole replacement set, matching the links endpoint. */
  const handleToggleLink = async (rq: ResearchQuestion, card: LinkableCard) => {
    const isGroup = card.kind === 'group';
    const current = isGroup ? rq.groups : rq.images;
    const next = current.includes(card.id)
      ? current.filter((cardId) => cardId !== card.id)
      : [...current, card.id];

    // Optimistic: the checkbox flips immediately, then reconciles with the server response.
    setQuestions((prev) =>
      prev.map((q) => (q.id === rq.id ? { ...q, [isGroup ? 'groups' : 'images']: next } : q)),
    );

    try {
      await updateResearchQuestionLinks(
        rq.id,
        isGroup ? { group_ids: next } : { image_ids: next },
        targetUser,
      );
      onLinksChanged?.();
    } catch (e) {
      setError('Could not update links.');
      await load();
    }
  };

  const linkedCount = (rq: ResearchQuestion) => rq.images.length + rq.groups.length;

  const isLinked = (rq: ResearchQuestion, card: LinkableCard) =>
    card.kind === 'group' ? rq.groups.includes(card.id) : rq.images.includes(card.id);

  return (
    <div className="w-full p-3">
      {/* Panel header */}
      <div className="flex flex-row w-full">
        <h3 className="text-sm text-gray-500 font-regular mb-2 mt-0">Research Questions</h3>
      </div>

      <p className="text-sm text-grey-darkest mb-3">
        What questions would you like your data to answer?
      </p>

      {error && <p className="text-xs text-bama-crimson mb-2">{error}</p>}

      {/* Composer — always shown while the list is empty, otherwise tucked behind "+ Add question"
          so the panel stays compact once questions exist. */}
      {!readOnly && (
        <div className="mb-3">
          {composerOpen ? (
            <>
              <textarea
                id="rq-draft-input"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Add a research question..."
                rows={2}
                autoFocus={questions.length > 0}
                className="w-full text-sm text-grey-darkest bg-white border border-grey-light rounded-md p-2 resize-none focus:outline-none focus:border-bama-crimson"
              />
              <div className="flex gap-2 mt-1.5">
                <button
                  id="rq-add-button"
                  log-id="research-questions-add-button"
                  onClick={handleAdd}
                  disabled={!draft.trim()}
                  className="flex items-center justify-center whitespace-nowrap shrink-0 text-sm border border-transparent rounded-t-2xl rounded-b-2xl px-3 py-1 bg-bama-crimson text-white hover:-translate-y-[.05rem] hover:shadow-lg hover:brightness-95 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                >
                  Add question
                </button>
                {questions.length > 0 && (
                  <button
                    onClick={() => { setShowComposer(false); setDraft(''); }}
                    className="flex items-center justify-center whitespace-nowrap shrink-0 text-sm border border-grey-light rounded-t-2xl rounded-b-2xl px-3 py-1 bg-grey-lightest text-grey-darkest hover:-translate-y-[.05rem] hover:shadow-lg hover:brightness-95 transition duration-200"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </>
          ) : (
            <button
              id="rq-add-toggle"
              log-id="research-questions-add-toggle"
              onClick={() => setShowComposer(true)}
              className="flex items-center justify-center gap-1 whitespace-nowrap shrink-0 text-sm border border-transparent rounded-t-2xl rounded-b-2xl px-3 py-1 bg-bama-crimson text-white hover:-translate-y-[.05rem] hover:shadow-lg hover:brightness-95 transition duration-200"
            >
              <span className="text-base leading-none">+</span> Add question
            </button>
          )}
        </div>
      )}

      {loading ? (
        <p className="text-xs text-grey-dark text-center py-4">Loading...</p>
      ) : questions.length === 0 ? (
        <p className="text-xs text-grey-dark text-center py-4">No research questions yet.</p>
      ) : (
        <div className="space-y-3">
          {questions.map((rq, idx) => (
            <div
              key={rq.id}
              className="bg-white rounded-md shadow-sm border border-grey-lightest overflow-hidden"
            >
              {/* Title strip — mirrors the feedback card treatment, a little tighter */}
              <div className="flex items-center gap-2 bg-bama-crimson text-white px-3 py-1.5">
                <img src={squares} alt="section" className="w-3.5 h-3.5 opacity-90" />
                <h4 className="font-semibold text-sm">RQ{idx + 1}</h4>
              </div>

              {/* Body */}
              <div className="p-2.5">
                {editingId === rq.id ? (
                  <>
                    <textarea
                      value={editingText}
                      onChange={(e) => setEditingText(e.target.value)}
                      rows={3}
                      className="w-full text-sm text-grey-darkest bg-white border border-grey-light rounded-md p-2 resize-none focus:outline-none focus:border-bama-crimson"
                    />
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={() => handleSaveEdit(rq.id)}
                        disabled={!editingText.trim()}
                        className="flex items-center justify-center whitespace-nowrap shrink-0 text-sm border border-transparent rounded-t-2xl rounded-b-2xl px-3 py-1 bg-bama-crimson text-white hover:-translate-y-[.05rem] hover:shadow-lg hover:brightness-95 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="flex items-center justify-center whitespace-nowrap shrink-0 text-sm border border-grey-light rounded-t-2xl rounded-b-2xl px-3 py-1 bg-grey-lightest text-grey-darkest hover:-translate-y-[.05rem] hover:shadow-lg hover:brightness-95 transition duration-200"
                      >
                        Cancel
                      </button>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-grey-darkest whitespace-pre-wrap">{rq.text}</p>
                )}

                {/* Linked-card summary + controls */}
                <div className="flex items-center flex-wrap gap-1.5 mt-3">
                  <span className="inline-block text-xs font-medium text-white bg-bama-crimson rounded-full px-3 py-0.5">
                    {linkedCount(rq)} linked
                  </span>
                  {!readOnly && editingId !== rq.id && (
                    <>
                      <button
                        onClick={() => setLinkingId(linkingId === rq.id ? null : rq.id)}
                        className="text-xs text-grey-darker underline hover:text-bama-crimson transition-colors duration-150"
                      >
                        {linkingId === rq.id ? 'Done' : 'Edit links'}
                      </button>
                      <button
                        onClick={() => {
                          setEditingId(rq.id);
                          setEditingText(rq.text);
                        }}
                        className="text-xs text-grey-darker underline hover:text-bama-crimson transition-colors duration-150"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(rq.id)}
                        className="text-xs text-grey-darker underline hover:text-bama-crimson transition-colors duration-150"
                      >
                        Delete
                      </button>
                    </>
                  )}
                </div>

                {/* Card checklist */}
                {linkingId === rq.id && !readOnly && (
                  <div className="mt-2 border-t border-grey-light pt-2 max-h-48 overflow-y-auto">
                    {cards.length === 0 ? (
                      <p className="text-xs text-grey-dark py-1">No cards in this workspace yet.</p>
                    ) : (
                      cards.map((card) => (
                        <label
                          key={`${card.kind}-${card.id}`}
                          className="flex items-center gap-2 py-1 text-xs text-grey-darkest cursor-pointer hover:bg-grey-lighter rounded px-1"
                        >
                          <input
                            type="checkbox"
                            checked={isLinked(rq, card)}
                            onChange={() => handleToggleLink(rq, card)}
                            className="accent-bama-crimson"
                          />
                          <span className="text-grey-dark">{KIND_LABEL[card.kind]}:</span>
                          <span className="truncate">{card.label}</span>
                        </label>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ResearchQuestionsPanel;
