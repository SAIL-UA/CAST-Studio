// Persistent left-rail navigation for the docs. On mobile the sidebar becomes a
// sticky bar under the top nav; a hamburger toggle on its right lets the reader
// collapse the group items to reclaim vertical space. Menu structure is data-driven
// so future modules (e.g. "Deep Dive") drop in without touching this component.

import { useState } from 'react';
import { ACCENT } from '@/components/LandingHeader';

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
    const [collapsed, setCollapsed] = useState(false);

    return (
        <nav aria-label="Docs navigation" data-collapsed={collapsed}>
            {/* Mobile-only toggle — CSS hides it on desktop */}
            <button
                type="button"
                className="docs-sidebar__toggle"
                onClick={() => setCollapsed(v => !v)}
                aria-expanded={!collapsed}
                aria-label={collapsed ? 'Show docs menu' : 'Hide docs menu'}
            >
                <span>Browse</span>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    {collapsed ? (
                        <>
                            <line x1="4" y1="7" x2="20" y2="7" />
                            <line x1="4" y1="12" x2="20" y2="12" />
                            <line x1="4" y1="17" x2="20" y2="17" />
                        </>
                    ) : (
                        <>
                            <line x1="6" y1="6" x2="18" y2="18" />
                            <line x1="18" y1="6" x2="6" y2="18" />
                        </>
                    )}
                </svg>
            </button>

            <div className="docs-sidebar__groups" style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
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
            </div>
        </nav>
    );
};

export default DocsSidebar;
