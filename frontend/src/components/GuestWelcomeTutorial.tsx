import { useState, useEffect } from 'react';

// Match the fonts + accent color used across TestLogin/wordmark
const SANS = "'Inter', 'Helvetica Neue', Helvetica, Arial, sans-serif";
const ACCENT = '#00849E';

// Padding around each highlighted element for the cutout hole.
const HOLE_PADDING = 8;

// Inline copy of the Bulb SVG from TestLogin so the tutorial isn't coupled to it.
const Bulb = ({ size = 16, color = '#fff' }: { size?: number; color?: string }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
         stroke={color} strokeWidth={1.8}
         strokeLinecap="round" strokeLinejoin="round"
         style={{ display: 'block' }}>
        <path d="M9 18h6" /><path d="M10 21h4" />
        <path d="M12 3a6 6 0 0 0-3.5 10.9c.6.45.9.9.9 1.6V18h5.2v-2.5c0-.7.3-1.15.9-1.6A6 6 0 0 0 12 3z" />
        <path d="M12 7v6" />
    </svg>
);

const LogoMark = () => (
    <span style={{
        width: 32, height: 32, borderRadius: 9,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0, background: ACCENT, color: '#fff',
    }}>
        <Bulb size={18} />
    </span>
);

// Per-screen config:
//   highlights: what to spotlight (0..N elements, matched by data-tour-target)
//   expand:     what dropdown / panel to force open (subscribed to via
//               useGuestTourOpen in the dropdown components and Home)
const SCREENS = [
    {
        title: 'Welcome to StoryStudio Workspace!',
        description:
            "We have provided a sample dataset for you. Click 'Next' to learn how you can create a data-driven story with it.",
        highlights: [] as string[],
        expand: null as string | null,
    },
    {
        title: 'Upload and annotate visuals',
        description:
            "Click to edit the description of a visual directly, or use AI from the 'Annotate' menu to create a description automatically. \n\nYou can also create notes and upload additional visuals from the 'Create' menu.",
        highlights: ['annotate', 'visual-3'],
        expand: 'annotate' as string | null,
    },
    {
        title: 'Group visuals',
        description:
            'Group visuals and notes that go together using "Group Manually" from the "Group" menu. You can also use the AI option to auto-group the workspace items.',
        highlights: ['group'],
        expand: 'group' as string | null,
    },
    {
        title: 'Select a narrative',
        description:
            "Create a narrative using 'Select Manually' from the 'Select Narrative' menu. You can choose from a variety of options, including Linear, Cause-Effect, and Problem-Solution. We have selected the 'Linear' narrative for you, feel free to drag items inside it.\n\nYou can also use the AI option to select a narrative for you.",
        highlights: ['narrative', 'scaffold-linear'],
        expand: 'narrative' as string | null,
    },
    {
        title: 'Generate story',
        description:
            'Click "Generate Story" to compose a story with your visuals, groups, and narratives. You can view and edit this story in the "Story Browser".',
        highlights: ['story', 'story-browser'],
        expand: null as string | null,
    },
];

type Rect = { top: number; left: number; width: number; height: number };
type Props = { onDismiss: () => void };

const GuestWelcomeTutorial = ({ onDismiss }: Props) => {
    const [screenIndex, setScreenIndex] = useState(0);
    const [holes, setHoles] = useState<Rect[]>([]);

    const isFirst = screenIndex === 0;
    const isLast = screenIndex === SCREENS.length - 1;
    const highlights = SCREENS[screenIndex].highlights;
    const expand = SCREENS[screenIndex].expand;

    // Broadcast which dropdown/panel to force open on this screen. Consumers
    // (AnnotateVisualsButton / GroupButton / GenerateStoryButton / Home /
    // NarrativePatterns) subscribe via useGuestTourOpen(name). Also drives
    // the "menus visible but non-interactive during tour" CSS rule.
    useEffect(() => {
        if (expand) {
            document.body.setAttribute('data-guest-tour-open', expand);
        } else {
            document.body.removeAttribute('data-guest-tour-open');
        }
        return () => {
            document.body.removeAttribute('data-guest-tour-open');
        };
    }, [expand]);

    // Measure every highlight target. Targets live inside a transformed
    // workspace canvas — z-index is trapped in a nested stacking context —
    // so we draw a dark SVG mask with rectangular holes punched wherever a
    // target sits on the viewport.
    //
    // Timing: tutorial mounts before Bin has rendered scaffolds/cards →
    // MutationObserver watches for targets to appear. ResizeObserver picks up
    // size changes when images finish loading.
    useEffect(() => {
        if (highlights.length === 0) {
            setHoles([]);
            return;
        }

        const measure = () => {
            const rects: Rect[] = [];
            for (const name of highlights) {
                const el = document.querySelector<HTMLElement>(`[data-tour-target="${name}"]`);
                if (!el) continue;
                const r = el.getBoundingClientRect();
                rects.push({ top: r.top, left: r.left, width: r.width, height: r.height });
            }
            setHoles(rects);
        };

        measure();

        const mutationObserver = new MutationObserver(() => measure());
        mutationObserver.observe(document.body, { childList: true, subtree: true, attributes: true });

        const resizeObserver = new ResizeObserver(() => measure());
        const attached = new WeakSet<Element>();
        const attachResizeObservers = () => {
            for (const name of highlights) {
                const el = document.querySelector(`[data-tour-target="${name}"]`);
                if (el && !attached.has(el)) {
                    resizeObserver.observe(el);
                    attached.add(el);
                }
            }
        };
        attachResizeObservers();
        const attachSync = new MutationObserver(attachResizeObservers);
        attachSync.observe(document.body, { childList: true, subtree: true });

        window.addEventListener('resize', measure);
        window.addEventListener('scroll', measure, true);
        return () => {
            mutationObserver.disconnect();
            resizeObserver.disconnect();
            attachSync.disconnect();
            window.removeEventListener('resize', measure);
            window.removeEventListener('scroll', measure, true);
        };
    // highlights is stable per screen (literal from SCREENS); depend on screenIndex.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [screenIndex]);

    const handleNext = () => {
        if (isLast) onDismiss();
        else setScreenIndex(screenIndex + 1);
    };
    const handlePrev = () => {
        if (!isFirst) setScreenIndex(screenIndex - 1);
    };

    // ── Backdrop ──
    // SVG mask paints the viewport dark, punches transparent holes wherever a
    // highlighted target sits. pointer-events: none — the click-catcher below
    // absorbs interactions.
    const dark = 'rgba(0, 0, 0, 0.5)';
    const hasHoles = holes.length > 0;
    const backdrop = hasHoles ? (
        <svg
            style={{
                position: 'fixed', inset: 0, width: '100vw', height: '100vh',
                zIndex: 1000, pointerEvents: 'none',
            }}
        >
            <defs>
                <mask id="guest-tour-cutout">
                    <rect x="0" y="0" width="100%" height="100%" fill="white" />
                    {holes.map((h, i) => (
                        <rect key={i}
                            x={h.left - HOLE_PADDING}
                            y={h.top - HOLE_PADDING}
                            width={h.width + HOLE_PADDING * 2}
                            height={h.height + HOLE_PADDING * 2}
                            rx={8} ry={8}
                            fill="black"
                        />
                    ))}
                </mask>
            </defs>
            <rect x="0" y="0" width="100%" height="100%" fill={dark} mask="url(#guest-tour-cutout)" />
        </svg>
    ) : (
        <div style={{ position: 'fixed', inset: 0, background: dark, zIndex: 1000 }} />
    );

    return (
        <>
            {backdrop}

            {/* Full-viewport transparent click-catcher — absorbs all workspace
                interactions so highlighted elements stay "look but don't touch". */}
            <div style={{
                position: 'fixed', inset: 0,
                zIndex: 1001, background: 'transparent',
            }} />

            {/* Teal decorative rings around each hole (non-interactive). */}
            {holes.map((h, i) => (
                <div key={i} style={{
                    position: 'fixed',
                    top: h.top - HOLE_PADDING,
                    left: h.left - HOLE_PADDING,
                    width: h.width + HOLE_PADDING * 2,
                    height: h.height + HOLE_PADDING * 2,
                    zIndex: 1002, pointerEvents: 'none',
                    border: `3px solid ${ACCENT}`, borderRadius: 8,
                    boxShadow: '0 0 20px rgba(0, 132, 158, 0.6)',
                }} />
            ))}

            {/* Modal — sits above everything. Wrapper is pointer-events:none so
                clicks outside the modal box fall through to the click-catcher. */}
            <div
                style={{
                    position: 'fixed', inset: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    zIndex: 1010, pointerEvents: 'none',
                    fontFamily: SANS,
                }}
            >
                <div
                    style={{
                        pointerEvents: 'auto',
                        background: '#fff', borderRadius: 8, margin: '0 16px',
                        width: '100%', maxWidth: 520, padding: '28px 28px 20px',
                        fontFamily: SANS,
                    }}
                >
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        marginBottom: 16, textAlign: 'left',
                    }}>
                        <LogoMark />
                        <h2 style={{
                            fontFamily: SANS, fontWeight: 700, fontSize: 20,
                            letterSpacing: '-0.015em', color: '#0a0a0a',
                            lineHeight: 1.2, margin: 0, textAlign: 'left',
                        }}>
                            {SCREENS[screenIndex].title}
                        </h2>
                    </div>

                    <div style={{
                        fontFamily: SANS, fontSize: 15, color: '#333',
                        lineHeight: 1.5, minHeight: 80, marginBottom: 24,
                        textAlign: 'left', whiteSpace: 'pre-wrap',
                    }}>
                        {SCREENS[screenIndex].description}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{
                            fontFamily: SANS, fontSize: 12, color: '#6b6b6b',
                            letterSpacing: '-0.005em',
                        }}>
                            ({screenIndex + 1}/{SCREENS.length})
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <button type="button" onClick={handlePrev} disabled={isFirst} style={{
                                fontFamily: SANS, fontSize: 13.5, fontWeight: 500,
                                padding: '8px 16px', borderRadius: 999,
                                border: '1px solid #d1d5db', background: '#fff', color: '#1a1a1a',
                                cursor: isFirst ? 'not-allowed' : 'pointer',
                                opacity: isFirst ? 0.4 : 1, transition: 'background 0.15s',
                            }}>Previous</button>
                            <button type="button" onClick={handleNext} style={{
                                fontFamily: SANS, fontSize: 13.5, fontWeight: 600,
                                padding: '8px 16px', borderRadius: 999,
                                border: 'none', background: ACCENT, color: '#fff',
                                cursor: 'pointer', transition: 'filter 0.15s',
                            }}>
                                {isLast ? 'Go to Workspace' : 'Next'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default GuestWelcomeTutorial;
