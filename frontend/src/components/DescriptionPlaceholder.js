export const StylizedPlaceholder = ({ lines = 4 }) => {
  return (
    <div className="ai-placeholder">
      <div className="ai-chip">AI is writing</div>
      <div className="ai-lines">
        {Array.from({ length: lines }).map((_, i) => (
          <div key={i} className="ai-line" />
        ))}
      </div>
      <div className="ai-ellipsis">Generating description<span className="dots"><span>.</span><span>.</span><span>.</span></span></div>
    </div>
  );
};
