import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { getResearchQuestions, updateResearchQuestionLinks } from '../services/api';

type RqLinkMap = Record<string, string[]>;

/** Enough of a research question for a card to render a link toggle. */
export type RqSummary = {
  id: string;
  label: string;
  text: string;
  images: string[];
  groups: string[];
};

interface ResearchQuestionsContextValue {
  /** cardId -> ["RQ1", "RQ3"]. Covers both ImageData and GroupData ids. */
  rqLabelsByCard: RqLinkMap;
  /** Ordered questions, labelled RQ1..RQn to match the panel. */
  questions: RqSummary[];
  /** Refetch links. Pass the host id when viewing someone else's workspace. */
  refreshRqLinks: (targetUser?: string) => Promise<void>;
  /** Add/remove one card on one question. Returns false if the write failed. */
  toggleCardLink: (rqId: string, cardId: string, isGroup: boolean) => Promise<boolean>;
}

const ResearchQuestionsContext = createContext<ResearchQuestionsContextValue>({
  rqLabelsByCard: {},
  questions: [],
  refreshRqLinks: async () => {},
  toggleCardLink: async () => false,
});

const buildLinkMap = (questions: RqSummary[]): RqLinkMap => {
  const map: RqLinkMap = {};
  questions.forEach((rq) => {
    [...rq.images, ...rq.groups].forEach((cardId) => {
      if (!map[cardId]) map[cardId] = [];
      map[cardId].push(rq.label);
    });
  });
  return map;
};

/**
 * Supplies RQ badges and a per-card link toggle without threading props through the 13
 * places DraggableCard is rendered.
 */
export const ResearchQuestionsProvider = ({ children }: { children: React.ReactNode }) => {
  const [questions, setQuestions] = useState<RqSummary[]>([]);
  const [rqLabelsByCard, setRqLabelsByCard] = useState<RqLinkMap>({});
  // Remembered from the last refresh so card-level writes hit the same workspace.
  const targetUserRef = useRef<string | undefined>(undefined);

  const refreshRqLinks = useCallback(async (targetUser?: string) => {
    targetUserRef.current = targetUser;
    try {
      const data = await getResearchQuestions(targetUser);
      const summaries: RqSummary[] = (data || []).map((rq: any, idx: number) => ({
        id: rq.id,
        label: `RQ${idx + 1}`,
        text: rq.text || '',
        images: rq.images || [],
        groups: rq.groups || [],
      }));
      setQuestions(summaries);
      setRqLabelsByCard(buildLinkMap(summaries));
    } catch (err) {
      // A failed refresh just means no badges; never block the board from rendering.
      console.error('Error refreshing research question links:', err);
    }
  }, []);

  const toggleCardLink = useCallback(async (rqId: string, cardId: string, isGroup: boolean) => {
    const rq = questions.find((q) => q.id === rqId);
    if (!rq) return false;

    const current = isGroup ? rq.groups : rq.images;
    const next = current.includes(cardId)
      ? current.filter((id) => id !== cardId)
      : [...current, cardId];

    // Optimistic: the badge and checkbox update before the request resolves.
    const optimistic = questions.map((q) =>
      q.id === rqId ? { ...q, [isGroup ? 'groups' : 'images']: next } : q,
    );
    setQuestions(optimistic);
    setRqLabelsByCard(buildLinkMap(optimistic));

    try {
      await updateResearchQuestionLinks(
        rqId,
        isGroup ? { group_ids: next } : { image_ids: next },
        targetUserRef.current,
      );
      return true;
    } catch (err) {
      console.error('Error toggling research question link:', err);
      await refreshRqLinks(targetUserRef.current);  // roll back to server truth
      return false;
    }
  }, [questions, refreshRqLinks]);

  const value = useMemo(
    () => ({ rqLabelsByCard, questions, refreshRqLinks, toggleCardLink }),
    [rqLabelsByCard, questions, refreshRqLinks, toggleCardLink],
  );

  return (
    <ResearchQuestionsContext.Provider value={value}>
      {children}
    </ResearchQuestionsContext.Provider>
  );
};

export const useResearchQuestions = () => useContext(ResearchQuestionsContext);
