// Persistent left-rail navigation for the docs. Groups render as always-open
// (per current design); items highlight when their target section is in view.
// The menu structure is data-driven so future modules (e.g. "Deep Dive") can
// be dropped in without touching this component.

import { ACCENT } from './LandingHeader';

export type DocsMenuItem = {
    label: string;
    /** Anchor id to scroll to within the current page. */
    targetId?: string;
    /** Route to navigate to. (Reserved for cross-page nav; not used yet.) */
    path?: string;
};

export type DocsMenuGroup = {
    label: string;
    items: DocsMenuItem[];
};

export type DocsMenuStructure = DocsMenuGroup[];

type DocsSidebarProps = {
    menu: DocsMenuStructure;
    /** The anchor id of the section currently in view — used to highlight the matching item. */
    activeId?: string;
    /** Handler for anchor items. Sidebar itself doesn't know how to scroll. */
    onSelect: (targetId: string) => void;
};

export const DocsSidebar = ({ menu, activeId, onSelect }: DocsSidebarProps) => {
    return (
        <nav aria-label="Docs navigation" style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
            {menu.map((group) => (
                <div key={group.label} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div style={{
                        fontSize: 11, fontWeight: 600, letterSpacing: '0.08em',
                        textTransform: 'uppercase', color: '#6b6b6b',
                        padding: '0 10px 6px',
                    }}>
                        {group.label}
                    </div>
                    {group.items.map((item) => {
                        const isActive = item.targetId != null && activeId === item.targetId;
                        return (
                            <button
                                key={item.label}
                                onClick={() => item.targetId && onSelect(item.targetId)}
                                className="landing-nav-link"
                                style={{
                                    textAlign: 'left', border: 'none', cursor: 'pointer',
                                    padding: '7px 10px', borderRadius: 8,
                                    fontSize: 13.5, fontWeight: isActive ? 600 : 500, letterSpacing: '-0.005em',
                                    color: isActive ? ACCENT : '#1a1a1a',
                                    background: isActive ? `${ACCENT}14` : 'transparent',
                                    transition: 'background 150ms',
                                }}
                            >
                                {item.label}
                            </button>
                        );
                    })}
                </div>
            ))}
        </nav>
    );
};

export default DocsSidebar;
