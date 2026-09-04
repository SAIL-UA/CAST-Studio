import React, { useCallback, useEffect, useState } from 'react';
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

  const composerOpen = showComposer;

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

  // NOTE: we intentionally do NOT reload from server when ctxQuestions changes.
  // A card-level link toggle in RqLinkPicker updates the context optimistically and
  // fires the PUT in the background. If we called load() here, its GET would race
  // the pending PUT and often return stale data — leaving the "N linked" count and
  // the panel checkboxes out of sync with what the user just clicked. Instead,
  // linkedCount() and isLinked() below read from ctxQuestions when possible, which
  // reflects those optimistic updates immediately.

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

  // Blur-to-save wrapper: always exits edit mode (so a bare click-in-and-out doesn't
  // leave the editor stuck open). Skips the network call when the text is unchanged
  // or empty, matching how DraggableCard's inline title editing behaves.
  const handleFinishEdit = async (id: string) => {
    const text = editingText.trim();
    const original = (questions.find((q) => q.id === id)?.text || '').trim();
    if (!text || text === original) {
      setEditingId(null);
      setEditingText('');
      return;
    }
    await handleSaveEdit(id);
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

  // Prefer context data for links so external toggles (e.g. RqLinkPicker on a card
   // header) reflect here without a server round-trip. Falls back to local state
   // for questions that context hasn't loaded yet.
  const resolveLinks = (rq: ResearchQuestion) => {
    const ctxRq = ctxQuestions.find((q) => q.id === rq.id);
    return {
      images: ctxRq ? ctxRq.images : rq.images,
      groups: ctxRq ? ctxRq.groups : rq.groups,
    };
  };

  const linkedCount = (rq: ResearchQuestion) => {
    const { images, groups } = resolveLinks(rq);
    return images.length + groups.length;
  };

  const isLinked = (rq: ResearchQuestion, card: LinkableCard) => {
    const { images, groups } = resolveLinks(rq);
    return card.kind === 'group' ? groups.includes(card.id) : images.includes(card.id);
  };

  return (
    <div className="w-full p-3">
      {/* Panel header — pill mirrors the Data Stories treatment. */}
      <div className="flex flex-row w-full">
        <span
          style={{ background: '#348b95' }}
          className="text-white text-lg font-roboto-semibold px-3 py-1.5 rounded-lg inline-block"
        >
          Research Questions
        </span>
      </div>

      <p className="text-sm text-grey-darkest mt-4 mb-3">
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
                  style={{ background: '#348b95' }}
                  className="flex items-center justify-center gap-1 whitespace-nowrap shrink-0 text-sm border border-transparent rounded-t-2xl rounded-b-2xl px-3 py-1 text-white hover:-translate-y-[.05rem] hover:shadow-lg hover:brightness-95 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                >
                  <span className="text-base leading-none">+</span> Add question
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
              style={{ background: '#348b95' }}
              className="flex items-center justify-center gap-1 whitespace-nowrap shrink-0 text-sm border border-transparent rounded-t-2xl rounded-b-2xl px-3 py-1 text-white hover:-translate-y-[.05rem] hover:shadow-lg hover:brightness-95 transition duration-200"
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
              {/* Title strip — mirrors the feedback card treatment, a little tighter.
                  Pen (edit) and X (delete) icons on the right match the workspace card
                  header pattern from DraggableCard. */}
              <div
                className="flex items-center justify-between gap-2 text-white px-3 py-1.5"
                style={{ background: '#348b95' }}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-90 flex-shrink-0" aria-hidden="true">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                  <h4 className="font-semibold text-sm">Q{idx + 1}</h4>
                </div>
                {!readOnly && editingId !== rq.id && (
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => { setEditingId(rq.id); setEditingText(rq.text); }}
                      className="w-4 h-4 bg-white/20 hover:bg-white/40 rounded-full flex items-center justify-center text-white transition-all duration-200"
                      title="Edit question"
                      log-id="research-question-edit-button"
                    >
                      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 20h9" />
                        <path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDelete(rq.id)}
                      className="w-4 h-4 bg-white/20 hover:bg-white/40 rounded-full flex items-center justify-center text-white transition-all duration-200"
                      title="Delete question"
                      log-id="research-question-delete-button"
                    >
                      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="6" y1="6" x2="18" y2="18" />
                        <line x1="18" y1="6" x2="6" y2="18" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>

              {/* Body */}
              <div
                className="p-2.5"
                style={{ background: '#e0f1f6', border: '0.5px dashed #000' }}
              >
                {editingId === rq.id ? (
                  <textarea
                    value={editingText}
                    onChange={(e) => setEditingText(e.target.value)}
                    onBlur={() => handleFinishEdit(rq.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') {
                        e.preventDefault();
                        setEditingId(null);
                        setEditingText('');
                      }
                    }}
                    autoFocus
                    rows={3}
                    className="w-full text-sm text-grey-darkest bg-white border border-grey-light rounded-md p-2 resize-none focus:outline-none focus:border-bama-crimson"
                  />
                ) : (
                  <p
                    className={`text-sm text-grey-darkest whitespace-pre-wrap ${readOnly ? '' : 'cursor-pointer'}`}
                    onClick={() => {
                      if (readOnly) return;
                      setEditingId(rq.id);
                      setEditingText(rq.text);
                    }}
                    title={readOnly ? undefined : 'Click to edit'}
                  >
                    {rq.text}
                  </p>
                )}

                {/* Linked-card summary — a single dropdown pill.
                    Read-only mode gets a plain non-clickable pill (no caret). */}
                <div className="flex items-center flex-wrap gap-1.5 mt-3">
                  {readOnly || editingId === rq.id ? (
                    <span
                      className="inline-block text-xs font-medium text-white rounded-full px-3 py-0.5"
                      style={{ background: '#348b95' }}
                    >
                      {linkedCount(rq)} linked
                    </span>
                  ) : (
                    <button
                      onClick={() => setLinkingId(linkingId === rq.id ? null : rq.id)}
                      style={{ background: '#348b95' }}
                      className="inline-flex items-center gap-1 text-xs font-medium text-white rounded-full px-3 py-0.5 hover:brightness-110 transition-all duration-150"
                      aria-expanded={linkingId === rq.id}
                      log-id="research-question-linked-dropdown"
                    >
                      <span>{linkedCount(rq)} linked</span>
                      <svg
                        width="10" height="10" viewBox="0 0 20 20" fill="currentColor"
                        className={`transition-transform duration-200 ${linkingId === rq.id ? 'rotate-180' : ''}`}
                      >
                        <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </button>
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
