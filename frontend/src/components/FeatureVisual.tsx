// Large evocative visuals for the landing page feature bands. Each drawing has
// dark near-black "screens" (windows, documents, tiles) with white contents,
// sitting on the light gray card. Elements *between* screens — arrows, ghost
// tiles in transit, the AI sparkle — stay dark on gray so they read as "in
// between the panels." See TestLogin.tsx FEATURES → FeatureBand for callers.

// Dark palette (used for elements sitting on the gray card surface)
const stroke = '#0a0a0a';
const strokeSoft = 'rgba(10,10,10,0.35)';
const fillSoft = 'rgba(10,10,10,0.05)';

// Inverted palette (used for elements inside a dark screen)
const screen = '#111111';
const accent = '#00849E';
const invStroke = '#ffffff';
const invStrokeSoft = 'rgba(255,255,255,0.55)';
const invFillSoft = 'rgba(255,255,255,0.10)';

const commonProps = {
    fill: 'none',
    stroke,
    strokeWidth: 1.6,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
};

// 1. Notebook → workspace transfer.
const NotebookVisual = () => (
    <svg width="100%" height="100%" viewBox="0 0 300 300" {...commonProps}>
        {/* ── Notebook (source) ────────────────────────────────── */}
        <rect x="8" y="30" width="106" height="240" rx="10" fill={screen} stroke="none" />
        {/* Code cell */}
        <rect x="16" y="42" width="90" height="38" rx="6" fill={invFillSoft} stroke={invStrokeSoft} />
        <text x="24" y="58" fontFamily="monospace" fontSize="9" fill={invStroke} stroke="none">[1]:</text>
        <line x1="48" y1="56" x2="98" y2="56" stroke={invStrokeSoft} strokeWidth="1.2" />
        <line x1="24" y1="70" x2="90" y2="70" stroke={invStrokeSoft} strokeWidth="1.2" />
        {/* Chart cell — highlighted "selection" */}
        <rect x="16" y="88" width="90" height="72" rx="6" fill={invFillSoft} stroke={invStroke} strokeWidth="1.6" strokeDasharray="4 3" />
        <line x1="24" y1="150" x2="98" y2="150" stroke={invStrokeSoft} strokeWidth="1.2" />
        {[
            { x: 28, h: 20 },
            { x: 40, h: 34 },
            { x: 52, h: 16 },
            { x: 64, h: 42 },
            { x: 76, h: 28 },
            { x: 88, h: 46 },
        ].map((b, i) => (
            <rect key={i} x={b.x} y={150 - b.h} width="8" height={b.h} rx="1.5" fill={invStroke} stroke="none" />
        ))}
        {/* Text cell */}
        <rect x="16" y="168" width="90" height="90" rx="6" fill={invFillSoft} stroke={invStrokeSoft} />
        <line x1="24" y1="184" x2="98" y2="184" stroke={invStrokeSoft} strokeWidth="1.2" />
        <line x1="24" y1="196" x2="88" y2="196" stroke={invStrokeSoft} strokeWidth="1.2" />
        <line x1="24" y1="208" x2="94" y2="208" stroke={invStrokeSoft} strokeWidth="1.2" />
        <line x1="24" y1="220" x2="82" y2="220" stroke={invStrokeSoft} strokeWidth="1.2" />
        <line x1="24" y1="232" x2="90" y2="232" stroke={invStrokeSoft} strokeWidth="1.2" />
        <line x1="24" y1="244" x2="76" y2="244" stroke={invStrokeSoft} strokeWidth="1.2" />

        {/* ── Transfer arrow across the middle (on the gray card, between the two screens) ─ */}
        <path d="M118 124 L 182 124" strokeWidth="1.8" />
        <path d="M174 118 L 184 124 L 174 130" strokeWidth="1.8" />

        {/* Ghost chart tile in transit — dark on gray */}
        <rect x="128" y="88" width="44" height="30" rx="4" fill={fillSoft} stroke={strokeSoft} strokeDasharray="3 3" />
        <line x1="134" y1="112" x2="166" y2="112" stroke={strokeSoft} strokeWidth="1" />
        <rect x="134" y="102" width="4" height="8" fill={strokeSoft} stroke="none" />
        <rect x="140" y="98" width="4" height="12" fill={strokeSoft} stroke="none" />
        <rect x="146" y="104" width="4" height="6" fill={strokeSoft} stroke="none" />
        <rect x="152" y="96" width="4" height="14" fill={strokeSoft} stroke="none" />
        <rect x="158" y="100" width="4" height="10" fill={strokeSoft} stroke="none" />

        {/* ── Workspace (destination) ─────────────────────────── */}
        <rect x="186" y="30" width="106" height="240" rx="10" fill={screen} stroke="none" />
        {/* Title bar */}
        <line x1="186" y1="52" x2="292" y2="52" stroke={invStrokeSoft} strokeWidth="1.2" />
        <circle cx="196" cy="41" r="2.5" fill={invStrokeSoft} stroke="none" />
        <circle cx="204" cy="41" r="2.5" fill={invStrokeSoft} stroke="none" />
        <circle cx="212" cy="41" r="2.5" fill={invStrokeSoft} stroke="none" />
        {/* Arriving chart — solid outlined, matches the source cell */}
        <rect x="194" y="60" width="90" height="60" rx="6" fill={invFillSoft} stroke={invStroke} strokeWidth="1.6" />
        <line x1="202" y1="112" x2="278" y2="112" stroke={invStrokeSoft} strokeWidth="1.2" />
        {[
            { x: 206, h: 20 },
            { x: 218, h: 34 },
            { x: 230, h: 16 },
            { x: 242, h: 42 },
            { x: 254, h: 28 },
            { x: 266, h: 46 },
        ].map((b, i) => (
            <rect key={i} x={b.x} y={112 - b.h} width="8" height={b.h} rx="1.5" fill={invStroke} stroke="none" />
        ))}
        {/* Existing workspace cards below */}
        <rect x="194" y="130" width="42" height="52" rx="6" stroke={invStrokeSoft} strokeWidth="1.2" />
        <rect x="198" y="136" width="34" height="20" rx="2" fill={invStrokeSoft} stroke="none" />
        <line x1="198" y1="164" x2="230" y2="164" stroke={invStrokeSoft} strokeWidth="1" />
        <line x1="198" y1="172" x2="224" y2="172" stroke={invStrokeSoft} strokeWidth="1" />

        <rect x="242" y="130" width="42" height="52" rx="6" stroke={invStrokeSoft} strokeWidth="1.2" />
        <line x1="246" y1="140" x2="278" y2="140" stroke={invStrokeSoft} strokeWidth="1" />
        <line x1="246" y1="148" x2="272" y2="148" stroke={invStrokeSoft} strokeWidth="1" />
        <rect x="246" y="156" width="32" height="22" rx="2" fill={invStrokeSoft} stroke="none" />

        <rect x="194" y="190" width="90" height="68" rx="6" stroke={invStrokeSoft} strokeWidth="1.2" />
        <line x1="202" y1="204" x2="276" y2="204" stroke={invStrokeSoft} strokeWidth="1" />
        <line x1="202" y1="214" x2="266" y2="214" stroke={invStrokeSoft} strokeWidth="1" />
        <line x1="202" y1="224" x2="272" y2="224" stroke={invStrokeSoft} strokeWidth="1" />
        <line x1="202" y1="234" x2="258" y2="234" stroke={invStrokeSoft} strokeWidth="1" />
        <line x1="202" y1="244" x2="270" y2="244" stroke={invStrokeSoft} strokeWidth="1" />
    </svg>
);

// 2. Two-column narrative structure: two primary tiles (Cause, Effect) at the top,
//    each with an indented stack of supporting tiles (Claims, Evidence) beneath —
//    the indent communicates ownership, tree-view style.
const StaircaseVisual = () => {
    const columns: { x: number; primary: string }[] = [
        { x: 30, primary: 'Cause' },
        { x: 160, primary: 'Effect' },
    ];
    const parentW = 110;
    const childW = 90;
    const childIndent = 20; // Right offset for the child stack so it reads as owned by the parent
    const tileH = 52;
    const gap = 8;
    const topY = 60;
    return (
        <svg width="100%" height="100%" viewBox="0 0 300 300" {...commonProps}>
            {columns.map((col, i) => {
                const childX = col.x + childIndent;
                const claimY = topY + tileH + gap;
                const evidenceY = topY + 2 * (tileH + gap);
                return (
                    <g key={i}>
                        {/* Parent */}
                        <rect x={col.x} y={topY} width={parentW} height={tileH} rx="8" fill={screen} stroke="none" />
                        <text x={col.x + parentW / 2} y={topY + 32} fontFamily="sans-serif" fontSize="16" fontWeight="600" fill={invStroke} stroke="none" textAnchor="middle">
                            {col.primary}
                        </text>
                        {/* Claims (child) */}
                        <rect x={childX} y={claimY} width={childW} height={tileH} rx="8" fill={screen} stroke="none" />
                        <text x={childX + childW / 2} y={claimY + 32} fontFamily="sans-serif" fontSize="15" fontWeight="500" fill={invStroke} stroke="none" textAnchor="middle">
                            Claims
                        </text>
                        {/* Evidence (child) */}
                        <rect x={childX} y={evidenceY} width={childW} height={tileH} rx="8" fill={screen} stroke="none" />
                        <text x={childX + childW / 2} y={evidenceY + 32} fontFamily="sans-serif" fontSize="15" fontWeight="500" fill={invStroke} stroke="none" textAnchor="middle">
                            Evidence
                        </text>
                    </g>
                );
            })}
        </svg>
    );
};

// 3. Three input tiles converging into an AI sparkle, then into a single output doc.
const SynthesisVisual = () => (
    <svg width="100%" height="100%" viewBox="0 0 300 300" {...commonProps}>
        {/* Input tiles — dark screens */}
        {/* sticky note (left) */}
        <rect x="30" y="30" width="60" height="60" rx="6" fill={screen} stroke="none" />
        <line x1="40" y1="50" x2="82" y2="50" stroke={invStrokeSoft} strokeWidth="1.4" />
        <line x1="40" y1="62" x2="76" y2="62" stroke={invStrokeSoft} strokeWidth="1.4" />
        <line x1="40" y1="74" x2="70" y2="74" stroke={invStrokeSoft} strokeWidth="1.4" />
        {/* mini chart (center) */}
        <rect x="120" y="30" width="60" height="60" rx="6" fill={screen} stroke="none" />
        <line x1="128" y1="80" x2="172" y2="80" stroke={invStrokeSoft} strokeWidth="1.2" />
        <rect x="134" y="60" width="8" height="20" rx="1.5" fill={invStroke} stroke="none" />
        <rect x="146" y="48" width="8" height="32" rx="1.5" fill={invStroke} stroke="none" />
        <rect x="158" y="54" width="8" height="26" rx="1.5" fill={invStroke} stroke="none" />
        {/* image tile (right) */}
        <rect x="210" y="30" width="60" height="60" rx="6" fill={screen} stroke="none" />
        <circle cx="228" cy="52" r="6" fill={invStroke} stroke="none" />
        <path d="M216 82 L 232 68 L 246 78 L 264 62 L 264 84 L 216 84 Z" fill={invStrokeSoft} stroke="none" />
        {/* Converging lines to sparkle — on the gray card, dark strokes */}
        <path d="M60 92 L 131.7 137.8" />
        <path d="M150 92 L 150 128" />
        <path d="M240 92 L 168.3 137.8" />
        {/* Sparkle — on the gray card */}
        <g transform="translate(150 150)">
            <path d="M0 -18 L 4 -4 L 18 0 L 4 4 L 0 18 L -4 4 L -18 0 L -4 -4 Z" fill={stroke} stroke="none" />
            <circle cx="0" cy="0" r="22" fill="none" stroke={strokeSoft} strokeWidth="1" strokeDasharray="3 4" />
        </g>
        {/* Flow down to output doc */}
        <path d="M150 178 L 150 210" />
        <path d="M144 204 L 150 214 L 156 204" />
        {/* Output document — dark screen */}
        <rect x="90" y="220" width="120" height="60" rx="8" fill={screen} stroke="none" />
        <line x1="102" y1="240" x2="198" y2="240" stroke={invStrokeSoft} strokeWidth="1.4" />
        <line x1="102" y1="254" x2="186" y2="254" stroke={invStrokeSoft} strokeWidth="1.4" />
        <line x1="102" y1="268" x2="170" y2="268" stroke={invStrokeSoft} strokeWidth="1.4" />
    </svg>
);

// 4. App window with small collaborator avatars — dark screen with nested outlined cards.
const CollaborateVisual = () => (
    <svg width="100%" height="100%" viewBox="0 0 300 300" {...commonProps}>
        {/* App window — dark screen */}
        <rect x="24" y="30" width="252" height="240" rx="14" fill={screen} stroke="none" />
        {/* Title bar */}
        <line x1="24" y1="66" x2="276" y2="66" stroke={invStrokeSoft} strokeWidth="1.2" />
        {/* Traffic lights */}
        <circle cx="42" cy="48" r="4" fill={invStrokeSoft} stroke="none" />
        <circle cx="56" cy="48" r="4" fill={invStrokeSoft} stroke="none" />
        <circle cx="70" cy="48" r="4" fill={invStrokeSoft} stroke="none" />
        {/* Presence avatars in the title bar (top-right).
            A and K are filled white with dark letters; M is outlined white ("me"). */}
        <g>
            <circle cx="218" cy="48" r="10" fill={invStroke} />
            <text x="218" y="52" fontFamily="sans-serif" fontSize="10" fontWeight="600" fill={stroke} stroke="none" textAnchor="middle">A</text>
        </g>
        <g>
            <circle cx="238" cy="48" r="10" fill={screen} stroke={invStroke} strokeWidth="1.4" />
            <text x="238" y="52" fontFamily="sans-serif" fontSize="10" fontWeight="600" fill={invStroke} stroke="none" textAnchor="middle">M</text>
        </g>
        <g>
            <circle cx="258" cy="48" r="10" fill={invStroke} />
            <text x="258" y="52" fontFamily="sans-serif" fontSize="10" fontWeight="600" fill={stroke} stroke="none" textAnchor="middle">K</text>
        </g>
        {/* Content cards inside workspace — outlined in white */}
        <rect x="44" y="90" width="100" height="160" rx="8" stroke={invStrokeSoft} strokeWidth="1.4" />
        <line x1="54" y1="108" x2="134" y2="108" stroke={invStrokeSoft} strokeWidth="1.2" />
        <line x1="54" y1="120" x2="124" y2="120" stroke={invStrokeSoft} strokeWidth="1.2" />
        <rect x="54" y="132" width="80" height="46" rx="4" fill={invStrokeSoft} stroke="none" />
        <line x1="54" y1="196" x2="134" y2="196" stroke={invStrokeSoft} strokeWidth="1.2" />
        <line x1="54" y1="208" x2="120" y2="208" stroke={invStrokeSoft} strokeWidth="1.2" />
        <line x1="54" y1="220" x2="130" y2="220" stroke={invStrokeSoft} strokeWidth="1.2" />
        <line x1="54" y1="232" x2="110" y2="232" stroke={invStrokeSoft} strokeWidth="1.2" />
        <rect x="156" y="90" width="100" height="160" rx="8" stroke={invStrokeSoft} strokeWidth="1.4" />
        <rect x="166" y="102" width="80" height="48" rx="4" fill={invStrokeSoft} stroke="none" />
        <line x1="166" y1="164" x2="246" y2="164" stroke={invStrokeSoft} strokeWidth="1.2" />
        <line x1="166" y1="176" x2="236" y2="176" stroke={invStrokeSoft} strokeWidth="1.2" />
        <line x1="166" y1="188" x2="242" y2="188" stroke={invStrokeSoft} strokeWidth="1.2" />
        <line x1="166" y1="200" x2="222" y2="200" stroke={invStrokeSoft} strokeWidth="1.2" />
        {/* Live cursor with initial label */}
        <path d="M200 218 L 214 224 L 208 228 L 212 236 L 208 238 L 204 230 L 198 234 Z" fill={invStroke} stroke="none" />
        <rect x="212" y="238" width="16" height="12" rx="3" fill={invStroke} stroke="none" />
        <text x="220" y="248" fontFamily="sans-serif" fontSize="8" fontWeight="600" fill={stroke} stroke="none" textAnchor="middle">M</text>
    </svg>
);

// 5. Document with highlighted lines connected to two comment bubbles.
const FeedbackVisual = () => (
    <svg width="100%" height="100%" viewBox="0 0 300 300" {...commonProps}>
        {/* Document — dark screen */}
        <rect x="30" y="40" width="150" height="220" rx="10" fill={screen} stroke="none" />
        {/* Text lines, two highlighted */}
        <line x1="46" y1="70" x2="164" y2="70" stroke={invStrokeSoft} strokeWidth="1.4" />
        <line x1="46" y1="84" x2="154" y2="84" stroke={invStrokeSoft} strokeWidth="1.4" />
        <rect x="42" y="98" width="126" height="12" rx="3" fill={invStroke} opacity="0.9" />
        <line x1="46" y1="126" x2="164" y2="126" stroke={invStrokeSoft} strokeWidth="1.4" />
        <line x1="46" y1="140" x2="150" y2="140" stroke={invStrokeSoft} strokeWidth="1.4" />
        <rect x="42" y="156" width="110" height="12" rx="3" fill={invStroke} opacity="0.9" />
        <line x1="46" y1="184" x2="164" y2="184" stroke={invStrokeSoft} strokeWidth="1.4" />
        <line x1="46" y1="198" x2="140" y2="198" stroke={invStrokeSoft} strokeWidth="1.4" />
        <line x1="46" y1="212" x2="160" y2="212" stroke={invStrokeSoft} strokeWidth="1.4" />
        <line x1="46" y1="226" x2="130" y2="226" stroke={invStrokeSoft} strokeWidth="1.4" />
        {/* Connector lines between the doc and the bubbles — on the gray card */}
        <path d="M168 104 L 208 84" strokeDasharray="3 4" strokeWidth="1.2" stroke={strokeSoft} />
        <path d="M152 162 L 208 190" strokeDasharray="3 4" strokeWidth="1.2" stroke={strokeSoft} />
        {/* Bubble 1: AI (with sparkle) — dark screen */}
        <g>
            <path d="M210 56 L 274 56 Q 282 56 282 64 L 282 92 Q 282 100 274 100 L 236 100 L 226 112 L 226 100 L 218 100 Q 210 100 210 92 Z" fill={screen} stroke="none" />
            <path d="M244 74 L 246 82 L 254 84 L 246 86 L 244 94 L 242 86 L 234 84 L 242 82 Z" fill={invStroke} stroke="none" />
            <line x1="256" y1="78" x2="272" y2="78" stroke={invStrokeSoft} strokeWidth="1.4" />
            <line x1="256" y1="86" x2="266" y2="86" stroke={invStrokeSoft} strokeWidth="1.4" />
        </g>
        {/* Bubble 2: instructor (plain) — dark screen */}
        <g>
            <path d="M210 168 L 274 168 Q 282 168 282 176 L 282 204 Q 282 212 274 212 L 236 212 L 226 224 L 226 212 L 218 212 Q 210 212 210 204 Z" fill={screen} stroke="none" />
            <line x1="222" y1="184" x2="270" y2="184" stroke={invStrokeSoft} strokeWidth="1.4" />
            <line x1="222" y1="194" x2="260" y2="194" stroke={invStrokeSoft} strokeWidth="1.4" />
            <line x1="222" y1="204" x2="250" y2="204" stroke={invStrokeSoft} strokeWidth="1.4" />
        </g>
    </svg>
);

export const FeatureVisual = ({ kind }: { kind: string }) => {
    switch (kind) {
        case 'notebook':
            return <NotebookVisual />;
        case 'graph':
            return <StaircaseVisual />;
        case 'plus':
            return <SynthesisVisual />;
        case 'chain':
            return <CollaborateVisual />;
        case 'reply':
            return <FeedbackVisual />;
        default:
            return null;
    }
};

export default FeatureVisual;
