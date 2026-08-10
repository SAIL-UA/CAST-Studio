// Large evocative visuals for the landing page feature bands. White-on-teal, static
// SVG, drawn to a 300x300 viewBox so each scene composes at the same visual weight.
// See TestLogin.tsx FEATURES → FeatureBand for callers.

const stroke = '#ffffff';
const strokeSoft = 'rgba(255,255,255,0.55)';
const fillSoft = 'rgba(255,255,255,0.12)';

const commonProps = {
    fill: 'none',
    stroke,
    strokeWidth: 1.6,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
};

// 1. Notebook page with three cells (code, chart, text).
const NotebookVisual = () => (
    <svg width="100%" height="100%" viewBox="0 0 300 300" {...commonProps}>
        {/* Page outline */}
        <rect x="40" y="24" width="220" height="252" rx="14" />
        {/* Cell 1: code */}
        <rect x="56" y="42" width="188" height="66" rx="8" fill={fillSoft} stroke={strokeSoft} />
        <text x="66" y="62" fontFamily="monospace" fontSize="11" fill={stroke} stroke="none">[1]:</text>
        <line x1="100" y1="60" x2="220" y2="60" stroke={strokeSoft} strokeWidth="1.4" />
        <line x1="66" y1="78" x2="200" y2="78" stroke={strokeSoft} strokeWidth="1.4" />
        <line x1="66" y1="92" x2="170" y2="92" stroke={strokeSoft} strokeWidth="1.4" />
        {/* Cell 2: bar chart */}
        <rect x="56" y="118" width="188" height="80" rx="8" fill={fillSoft} stroke={strokeSoft} />
        <line x1="66" y1="188" x2="234" y2="188" stroke={strokeSoft} strokeWidth="1.2" />
        {[
            { x: 74, h: 30 },
            { x: 98, h: 46 },
            { x: 122, h: 22 },
            { x: 146, h: 54 },
            { x: 170, h: 38 },
            { x: 194, h: 62 },
            { x: 218, h: 44 },
        ].map((b, i) => (
            <rect key={i} x={b.x} y={188 - b.h} width="14" height={b.h} rx="2" fill={stroke} stroke="none" />
        ))}
        {/* Cell 3: text */}
        <rect x="56" y="208" width="188" height="50" rx="8" fill={fillSoft} stroke={strokeSoft} />
        <line x1="66" y1="226" x2="230" y2="226" stroke={strokeSoft} strokeWidth="1.4" />
        <line x1="66" y1="240" x2="200" y2="240" stroke={strokeSoft} strokeWidth="1.4" />
    </svg>
);

// 2. Vertical stack of narrative-structure tiles with a downward arrow outside the stack.
const StaircaseVisual = () => {
    const labels = ['Cause', 'Effect', 'Claim', 'Evidence'];
    return (
        <svg width="100%" height="100%" viewBox="0 0 300 300" {...commonProps}>
            {labels.map((label, i) => {
                const y = 55 + i * 50;
                return (
                    <g key={i}>
                        <rect x="70" y={y} width="160" height="40" rx="8" fill={fillSoft} stroke={strokeSoft} />
                        <text x="150" y={y + 26} fontFamily="sans-serif" fontSize="16" fontWeight="500" fill={stroke} stroke="none" textAnchor="middle">
                            {label}
                        </text>
                    </g>
                );
            })}
            {/* Downward arrow to the right of the stack */}
            <path d="M250 65 L 250 240" strokeDasharray="6 6" strokeWidth="1.8" />
            <path d="M242 232 L 250 245 L 258 232" strokeWidth="1.8" />
        </svg>
    );
};

// 3. Three input tiles converging into an AI sparkle, then into a single output doc.
const SynthesisVisual = () => (
    <svg width="100%" height="100%" viewBox="0 0 300 300" {...commonProps}>
        {/* Input tiles */}
        {/* sticky note (left) */}
        <rect x="30" y="30" width="60" height="60" rx="6" fill={fillSoft} stroke={strokeSoft} />
        <line x1="40" y1="50" x2="82" y2="50" stroke={strokeSoft} strokeWidth="1.4" />
        <line x1="40" y1="62" x2="76" y2="62" stroke={strokeSoft} strokeWidth="1.4" />
        <line x1="40" y1="74" x2="70" y2="74" stroke={strokeSoft} strokeWidth="1.4" />
        {/* mini chart (center) */}
        <rect x="120" y="30" width="60" height="60" rx="6" fill={fillSoft} stroke={strokeSoft} />
        <line x1="128" y1="80" x2="172" y2="80" stroke={strokeSoft} strokeWidth="1.2" />
        <rect x="134" y="60" width="8" height="20" rx="1.5" fill={stroke} stroke="none" />
        <rect x="146" y="48" width="8" height="32" rx="1.5" fill={stroke} stroke="none" />
        <rect x="158" y="54" width="8" height="26" rx="1.5" fill={stroke} stroke="none" />
        {/* image tile (right) */}
        <rect x="210" y="30" width="60" height="60" rx="6" fill={fillSoft} stroke={strokeSoft} />
        <circle cx="228" cy="52" r="6" fill={stroke} stroke="none" />
        <path d="M216 82 L 232 68 L 246 78 L 264 62 L 264 84 L 216 84 Z" fill={strokeSoft} stroke="none" />
        {/* Converging lines to sparkle — each stops at the boundary of the r=22 circle around (150,150) */}
        <path d="M60 92 L 131.7 137.8" />
        <path d="M150 92 L 150 128" />
        <path d="M240 92 L 168.3 137.8" />
        {/* Sparkle */}
        <g transform="translate(150 150)">
            <path d="M0 -18 L 4 -4 L 18 0 L 4 4 L 0 18 L -4 4 L -18 0 L -4 -4 Z" fill={stroke} stroke="none" />
            <circle cx="0" cy="0" r="22" fill="none" stroke={strokeSoft} strokeWidth="1" strokeDasharray="3 4" />
        </g>
        {/* Flow down to output doc */}
        <path d="M150 178 L 150 210" />
        <path d="M144 204 L 150 214 L 156 204" />
        {/* Output document */}
        <rect x="90" y="220" width="120" height="60" rx="8" fill={fillSoft} />
        <line x1="102" y1="240" x2="198" y2="240" stroke={strokeSoft} strokeWidth="1.4" />
        <line x1="102" y1="254" x2="186" y2="254" stroke={strokeSoft} strokeWidth="1.4" />
        <line x1="102" y1="268" x2="170" y2="268" stroke={strokeSoft} strokeWidth="1.4" />
    </svg>
);

// 4. App window with small collaborator avatars in a title bar — approximating a real
//    collaboration interface. Includes a couple of content cards inside the workspace.
const CollaborateVisual = () => (
    <svg width="100%" height="100%" viewBox="0 0 300 300" {...commonProps}>
        {/* App window */}
        <rect x="24" y="30" width="252" height="240" rx="14" fill={fillSoft} stroke={strokeSoft} />
        {/* Title bar */}
        <line x1="24" y1="66" x2="276" y2="66" stroke={strokeSoft} strokeWidth="1.2" />
        {/* Traffic lights on the left */}
        <circle cx="42" cy="48" r="4" fill={strokeSoft} stroke="none" />
        <circle cx="56" cy="48" r="4" fill={strokeSoft} stroke="none" />
        <circle cx="70" cy="48" r="4" fill={strokeSoft} stroke="none" />
        {/* Presence avatars in the title bar (top-right) */}
        <g>
            <circle cx="218" cy="48" r="10" fill={stroke} />
            <text x="218" y="52" fontFamily="sans-serif" fontSize="10" fontWeight="600" fill="#00849E" stroke="none" textAnchor="middle">A</text>
        </g>
        <g>
            <circle cx="238" cy="48" r="10" fill="#ffffff" stroke="#00849E" strokeWidth="1.4" />
            <text x="238" y="52" fontFamily="sans-serif" fontSize="10" fontWeight="600" fill="#00849E" stroke="none" textAnchor="middle">M</text>
        </g>
        <g>
            <circle cx="258" cy="48" r="10" fill={stroke} />
            <text x="258" y="52" fontFamily="sans-serif" fontSize="10" fontWeight="600" fill="#00849E" stroke="none" textAnchor="middle">K</text>
        </g>
        {/* Content cards inside workspace */}
        <rect x="44" y="90" width="100" height="160" rx="8" stroke={strokeSoft} strokeWidth="1.4" />
        <line x1="54" y1="108" x2="134" y2="108" stroke={strokeSoft} strokeWidth="1.2" />
        <line x1="54" y1="120" x2="124" y2="120" stroke={strokeSoft} strokeWidth="1.2" />
        <rect x="54" y="132" width="80" height="46" rx="4" fill={strokeSoft} stroke="none" />
        <line x1="54" y1="196" x2="134" y2="196" stroke={strokeSoft} strokeWidth="1.2" />
        <line x1="54" y1="208" x2="120" y2="208" stroke={strokeSoft} strokeWidth="1.2" />
        <line x1="54" y1="220" x2="130" y2="220" stroke={strokeSoft} strokeWidth="1.2" />
        <line x1="54" y1="232" x2="110" y2="232" stroke={strokeSoft} strokeWidth="1.2" />
        <rect x="156" y="90" width="100" height="160" rx="8" stroke={strokeSoft} strokeWidth="1.4" />
        <rect x="166" y="102" width="80" height="48" rx="4" fill={strokeSoft} stroke="none" />
        <line x1="166" y1="164" x2="246" y2="164" stroke={strokeSoft} strokeWidth="1.2" />
        <line x1="166" y1="176" x2="236" y2="176" stroke={strokeSoft} strokeWidth="1.2" />
        <line x1="166" y1="188" x2="242" y2="188" stroke={strokeSoft} strokeWidth="1.2" />
        <line x1="166" y1="200" x2="222" y2="200" stroke={strokeSoft} strokeWidth="1.2" />
        {/* A tiny cursor labeled with a collaborator initial floating over the right card */}
        <path d="M200 218 L 214 224 L 208 228 L 212 236 L 208 238 L 204 230 L 198 234 Z" fill={stroke} stroke="none" />
        <rect x="212" y="238" width="16" height="12" rx="3" fill={stroke} stroke="none" />
        <text x="220" y="248" fontFamily="sans-serif" fontSize="8" fontWeight="600" fill="#00849E" stroke="none" textAnchor="middle">M</text>
    </svg>
);

// 5. Document with highlighted lines connected to two comment bubbles (AI + instructor).
const FeedbackVisual = () => (
    <svg width="100%" height="100%" viewBox="0 0 300 300" {...commonProps}>
        {/* Document */}
        <rect x="30" y="40" width="150" height="220" rx="10" fill={fillSoft} stroke={strokeSoft} />
        {/* Text lines, one highlighted */}
        <line x1="46" y1="70" x2="164" y2="70" stroke={strokeSoft} strokeWidth="1.4" />
        <line x1="46" y1="84" x2="154" y2="84" stroke={strokeSoft} strokeWidth="1.4" />
        <rect x="42" y="98" width="126" height="12" rx="3" fill={stroke} opacity="0.85" />
        <line x1="46" y1="126" x2="164" y2="126" stroke={strokeSoft} strokeWidth="1.4" />
        <line x1="46" y1="140" x2="150" y2="140" stroke={strokeSoft} strokeWidth="1.4" />
        <rect x="42" y="156" width="110" height="12" rx="3" fill={stroke} opacity="0.85" />
        <line x1="46" y1="184" x2="164" y2="184" stroke={strokeSoft} strokeWidth="1.4" />
        <line x1="46" y1="198" x2="140" y2="198" stroke={strokeSoft} strokeWidth="1.4" />
        <line x1="46" y1="212" x2="160" y2="212" stroke={strokeSoft} strokeWidth="1.4" />
        <line x1="46" y1="226" x2="130" y2="226" stroke={strokeSoft} strokeWidth="1.4" />
        {/* Connector lines to bubbles */}
        <path d="M168 104 L 208 84" strokeDasharray="3 4" strokeWidth="1.2" stroke={strokeSoft} />
        <path d="M152 162 L 208 190" strokeDasharray="3 4" strokeWidth="1.2" stroke={strokeSoft} />
        {/* Bubble 1: AI (with sparkle) */}
        <g>
            <path d="M210 56 L 274 56 Q 282 56 282 64 L 282 92 Q 282 100 274 100 L 236 100 L 226 112 L 226 100 L 218 100 Q 210 100 210 92 Z" fill={fillSoft} stroke={strokeSoft} />
            <path d="M244 74 L 246 82 L 254 84 L 246 86 L 244 94 L 242 86 L 234 84 L 242 82 Z" fill={stroke} stroke="none" />
            <line x1="256" y1="78" x2="272" y2="78" stroke={strokeSoft} strokeWidth="1.4" />
            <line x1="256" y1="86" x2="266" y2="86" stroke={strokeSoft} strokeWidth="1.4" />
        </g>
        {/* Bubble 2: instructor (plain) */}
        <g>
            <path d="M210 168 L 274 168 Q 282 168 282 176 L 282 204 Q 282 212 274 212 L 236 212 L 226 224 L 226 212 L 218 212 Q 210 212 210 204 Z" fill={fillSoft} stroke={strokeSoft} />
            <line x1="222" y1="184" x2="270" y2="184" stroke={strokeSoft} strokeWidth="1.4" />
            <line x1="222" y1="194" x2="260" y2="194" stroke={strokeSoft} strokeWidth="1.4" />
            <line x1="222" y1="204" x2="250" y2="204" stroke={strokeSoft} strokeWidth="1.4" />
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
