import React from 'react';

interface RqBadgesProps {
  /** Ordered labels, e.g. ["RQ1", "RQ3"]. */
  labels: string[];
  /** How many to show before collapsing the rest into a "+N" pill. */
  max?: number;
}

/**
 * Research question pills for a card or group header.
 *
 * Caps the visible count so a card linked to many questions doesn't crowd out its title;
 * the overflow collapses into a single "+N" pill that lists the hidden ones on hover.
 */
const RqBadges: React.FC<RqBadgesProps> = ({ labels, max = 1 }) => {
  if (labels.length === 0) return null;

  const visible = labels.slice(0, max);
  const hidden = labels.slice(max);

  const pill = 'inline-block flex-shrink-0 bg-white bg-opacity-25 text-white rounded-full px-1.5 leading-tight';

  return (
    <>
      {visible.map((label) => (
        <span key={label} title="Linked research question" className={pill} style={{ fontSize: '0.5rem' }}>
          {label}
        </span>
      ))}
      {hidden.length > 0 && (
        <span
          title={`Also linked to ${hidden.join(', ')}`}
          className={pill}
          style={{ fontSize: '0.5rem' }}
        >
          +{hidden.length}
        </span>
      )}
    </>
  );
};

export default RqBadges;
