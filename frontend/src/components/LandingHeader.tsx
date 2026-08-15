// Shared landing/docs header. Frosted sticky nav with a 1280px inner container.
// TestLogin (landing) and Tutorials (docs) both mount this so the two pages read
// as one site. The `active` prop highlights the current nav link; on the landing
// page pass no `active` and the plain teal Sign-up button carries the CTA.

import type { CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';

export const ACCENT = '#00849E';
export const SANS = "'Inter', 'Helvetica Neue', Helvetica, Arial, sans-serif";
export const MONO = "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace";

export const Bulb = ({ size = 14, color = 'currentColor' }: { size?: number; color?: string }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block' }}>
        <path d="M9 18h6" /><path d="M10 21h4" />
        <path d="M12 3a6 6 0 0 0-3.5 10.9c.6.45.9.9.9 1.6V18h5.2v-2.5c0-.7.3-1.15.9-1.6A6 6 0 0 0 12 3z" />
        <path d="M12 7v6" />
    </svg>
);

export const LogoMark = () => (
    <span style={{ width: 30, height: 30, borderRadius: 9, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: ACCENT, color: '#fff' }}>
        <Bulb size={16} />
    </span>
);

export const Wordmark = ({ subtitle }: { subtitle?: string }) => (
    <span
        style={{
            display: 'inline-flex', alignItems: 'baseline', gap: 6,
            WebkitFontSmoothing: 'antialiased', MozOsxFontSmoothing: 'grayscale',
        } as CSSProperties}
    >
        <span style={{ fontFamily: SANS, fontWeight: 600, fontSize: 17, letterSpacing: '-0.015em', lineHeight: 1, color: '#0a0a0a' }}>StoryStudio</span>
        {subtitle && (
            <span style={{ fontFamily: SANS, fontWeight: 300, fontSize: 17, letterSpacing: '-0.015em', lineHeight: 1, color: '#6b6b6b' }}>{subtitle}</span>
        )}
    </span>
);

export const NAV_LINKS: { label: string; href: string; key: 'home' | 'about' | 'docs' }[] = [
    { label: 'Home', href: '/login', key: 'home' },
    { label: 'About', href: 'http://cast.tahahassan.info', key: 'about' },
    { label: 'Docs', href: '/tutorials', key: 'docs' },
];

type LandingHeaderProps = {
    /** Which nav link to visually mark as the current page. */
    active?: 'home' | 'about' | 'docs';
    /** Appended after "StoryStudio" in a lighter weight — e.g. "Docs". */
    subtitle?: string;
    /** Overrides the default Sign-up behavior (which navigates to /login). */
    onSignUp?: () => void;
    /** Sign-up button label. Defaults to "Sign up". */
    signUpLabel?: string;
};

export const LandingHeader = ({ active, subtitle, onSignUp, signUpLabel = 'Sign up' }: LandingHeaderProps) => {
    const navigate = useNavigate();
    const handleSignUp = () => {
        if (onSignUp) onSignUp();
        else navigate('/login');
    };

    return (
        <header style={{
            background: 'rgba(255,255,255,0.85)', backdropFilter: 'saturate(180%) blur(20px)', WebkitBackdropFilter: 'saturate(180%) blur(20px)',
            borderBottom: '1px solid rgba(10,10,10,0.08)', padding: '14px 32px',
            position: 'sticky', top: 0, zIndex: 10,
            fontFamily: SANS,
            WebkitFontSmoothing: 'antialiased', MozOsxFontSmoothing: 'grayscale',
        } as CSSProperties}>
            <div style={{ maxWidth: 1280, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <a href="/login" style={{ display: 'flex', alignItems: 'center', gap: 11, textDecoration: 'none' }}>
                    <LogoMark />
                    <Wordmark subtitle={subtitle} />
                </a>
                {/* Desktop nav — hidden on narrow viewports via .landing-nav-desktop CSS */}
                <div className="landing-nav-desktop" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {NAV_LINKS.map(l => {
                        const isActive = active === l.key;
                        return (
                            <a
                                key={l.label}
                                href={l.href}
                                target={l.href.startsWith('http') ? '_blank' : undefined}
                                rel={l.href.startsWith('http') ? 'noreferrer' : undefined}
                                className="landing-nav-link"
                                style={{
                                    fontSize: 13.5, fontWeight: isActive ? 600 : 500, letterSpacing: '-0.005em',
                                    color: isActive ? ACCENT : '#1a1a1a',
                                    background: isActive ? `${ACCENT}14` : 'transparent',
                                    padding: '8px 14px', borderRadius: 999, textDecoration: 'none',
                                    transition: 'background 150ms',
                                }}
                            >
                                {l.label}
                            </a>
                        );
                    })}
                    <button onClick={handleSignUp} style={{
                        padding: '9px 18px', borderRadius: 999, border: 'none',
                        fontSize: 13.5, fontWeight: 600, letterSpacing: '-0.005em',
                        background: ACCENT, color: '#fff', cursor: 'pointer',
                    }}>
                        {signUpLabel}
                    </button>
                </div>

                {/* Mobile nav — the same links collapsed into a Radix dropdown. Only shown on narrow viewports. */}
                <div className="landing-nav-mobile">
                    <DropdownMenu.Root>
                        <DropdownMenu.Trigger asChild>
                            <button style={{
                                display: 'inline-flex', alignItems: 'center', gap: 8,
                                padding: '8px 14px', borderRadius: 999, border: 'none', cursor: 'pointer',
                                background: 'rgba(10,10,10,0.06)', color: '#1a1a1a',
                                fontSize: 13.5, fontWeight: 600, letterSpacing: '-0.005em',
                            }}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="4" y1="7" x2="20" y2="7" />
                                    <line x1="4" y1="12" x2="20" y2="12" />
                                    <line x1="4" y1="17" x2="20" y2="17" />
                                </svg>
                                Menu
                            </button>
                        </DropdownMenu.Trigger>
                        <DropdownMenu.Portal>
                            <DropdownMenu.Content
                                className="mt-1 mr-1 shadow-lg z-[400] bg-white rounded-lg py-1 min-w-[180px] overflow-visible"
                                sideOffset={4}
                                align="end"
                            >
                                {NAV_LINKS.map(l => {
                                    const isActive = active === l.key;
                                    return (
                                        <DropdownMenu.Item
                                            key={l.label}
                                            asChild
                                        >
                                            <a
                                                href={l.href}
                                                target={l.href.startsWith('http') ? '_blank' : undefined}
                                                rel={l.href.startsWith('http') ? 'noreferrer' : undefined}
                                                className="landing-nav-link"
                                                style={{
                                                    display: 'block',
                                                    padding: '8px 14px',
                                                    fontSize: 14, fontWeight: isActive ? 600 : 500, letterSpacing: '-0.005em',
                                                    color: isActive ? ACCENT : '#1a1a1a',
                                                    background: isActive ? `${ACCENT}14` : 'transparent',
                                                    textDecoration: 'none', outline: 'none', cursor: 'pointer',
                                                }}
                                            >
                                                {l.label}
                                            </a>
                                        </DropdownMenu.Item>
                                    );
                                })}
                                <div className="h-px mx-3 my-1 bg-grey" />
                                <DropdownMenu.Item asChild>
                                    <button
                                        onClick={handleSignUp}
                                        style={{
                                            display: 'block', width: '100%', textAlign: 'left',
                                            padding: '8px 14px', border: 'none', cursor: 'pointer',
                                            fontSize: 14, fontWeight: 600, letterSpacing: '-0.005em',
                                            color: ACCENT, background: 'transparent', outline: 'none',
                                        }}
                                    >
                                        {signUpLabel}
                                    </button>
                                </DropdownMenu.Item>
                            </DropdownMenu.Content>
                        </DropdownMenu.Portal>
                    </DropdownMenu.Root>
                </div>
            </div>
        </header>
    );
};

export default LandingHeader;
