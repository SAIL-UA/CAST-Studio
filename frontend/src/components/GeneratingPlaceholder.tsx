type GeneratingPlaceholderProps = {
  contentName?: string;
  lines?: number;
  // Optional live progress-stage label (Structuring & Theming, Sequencing, …)
  // shown next to the "AI is writing" chip. Gives the user a visible cue that
  // work is progressing during multi-second pre-stream stages.
  stageName?: string;
};

export const GeneratingPlaceholder = ({ contentName = 'description', lines = 4, stageName = '' }: GeneratingPlaceholderProps) => {
  return (
    <div className="ai-placeholder">
      <div className="ai-chip">AI is writing{stageName ? ` (${stageName})` : ''}</div>
      <div className="ai-lines">
        {Array.from({ length: lines }).map((_, i) => (
          <div key={i} className="ai-line" />
        ))}
      </div>
      <div className="ai-ellipsis">Generating {contentName}<span className="dots"><span>.</span><span>.</span><span>.</span></span></div>
    </div>
  );
};