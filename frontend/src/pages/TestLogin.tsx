import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/Auth';
import { login, register, guestLogin } from '../services/api';
import HighlightWord from '../components/HighlightWord';
import FeatureVisual from '../components/FeatureVisual';
import { LandingHeader, ACCENT as SHARED_ACCENT, SANS as SHARED_SANS } from '../components/LandingHeader';

// Re-alias shared constants so existing usages in this file don't need renaming.
const ACCENT = SHARED_ACCENT;

// Feature bands data — was previously rendered as a horizontal carousel; now one full-width band per item.
// `highlight` is matched case-insensitively against `t`; the matched substring is wrapped in
// <HighlightWord scrollTrigger> so it animates when the band scrolls into view.
const FEATURES: { t: string; d: string; icon: string; highlight: string }[] = [
    { t: 'Integrated with JupyterHub', d: 'Import visuals and annotations from Jupyter notebooks into an interactive workspace to filter, annotate and group.', icon: 'notebook', highlight: 'jupyterhub' },
    { t: 'Structure Narratives', d: 'Use narrative structure scaffolds to sort data insights into narratives.', icon: 'graph', highlight: 'narratives' },
    { t: 'Synthesize Stories', d: 'Use AI to synthesize notes, visuals, and annotations into a compelling data-driven story. Support your creative voice.', icon: 'plus', highlight: 'stories' },
    { t: 'Collaborate with Classmates', d: 'Share your workspace with up to three classmates to collaboratively craft data-driven stories.', icon: 'chain', highlight: 'collaborate' },
    { t: 'Receive Feedback', d: 'Provide and receive AI or instructor feedback seamlessly during a data-storytelling workflow.', icon: 'reply', highlight: 'feedback' },
];
const SANS = SHARED_SANS;

// Bulb / LogoMark / Wordmark / NAV_LINKS now live in ../components/LandingHeader
// and are consumed via <LandingHeader />. Local copies removed.

// ── Feature Band ────────────────────────────────────────────────────
// One full-width band per feature. Alternating text/card side per row (zigzag) and
// alternating background so bands read as distinct. The `feature-band__row` class
// stacks card-below-text on narrow viewports (see main.css).
// Case-insensitively find `highlight` inside `title` and wrap the matched substring
// in <HighlightWord>. Preserves the original casing from the title (so "jupyterhub"
// in the data still renders as "JupyterHub" on screen). Falls back to the plain
// title if no match or no highlight specified.
const renderTitle = (title: string, highlight?: string) => {
    if (!highlight) return title;
    const idx = title.toLowerCase().indexOf(highlight.toLowerCase());
    if (idx < 0) return title;
    const before = title.slice(0, idx);
    const match = title.slice(idx, idx + highlight.length);
    const after = title.slice(idx + highlight.length);
    return <>{before}<HighlightWord scrollTrigger>{match}</HighlightWord>{after}</>;
};

const FeatureBand = ({ title, description, icon, index, highlight }: { title: string; description: string; icon: string; index: number; highlight?: string }) => {
    const isOdd = index % 2 === 1;
    const isReverse = index % 2 === 0; // Band 0 shows card on the left, text on the right; then alternate.
    const bandBg = isOdd ? '#f5f5f7' : '#ffffff';
    return (
        <section className="feature-band" style={{ background: bandBg, padding: '96px 48px' }}>
            <div className={`feature-band__row ${isReverse ? 'feature-band__row--reverse' : ''}`}>
                <div className="feature-band__text">
                    <h2 style={{ margin: 0, fontSize: 60, fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1.1 }}>{renderTitle(title, highlight)}</h2>
                    <p style={{ marginTop: 20, marginBottom: 0, fontSize: 19, lineHeight: 1.55, color: '#555', maxWidth: 520, letterSpacing: '-0.005em' }}>{description}</p>
                </div>
                <div className="feature-band__card-wrap">
                    <div style={{
                        width: '100%', aspectRatio: '1 / 1', maxWidth: 420,
                        borderRadius: 40, background: '#e9e9e9',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 1px 2px rgba(10,10,10,0.04), 0 20px 48px rgba(10,10,10,0.08)',
                        padding: 32,
                    }}>
                        <div style={{ width: '100%', height: '100%', maxWidth: 300, maxHeight: 300 }}>
                            <FeatureVisual kind={icon} />
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

// ── Form Field (Apple-style rounded, filled) ────────────────────────
const FormField = ({ label, placeholder, type = 'text', value, onChange, inputRef }: { label: string; placeholder: string; type?: string; value: string; onChange: (v: string) => void; inputRef?: React.RefObject<HTMLInputElement | null> }) => {
    const [focus, setFocus] = useState(false);
    return (
        <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: 12.5, color: '#6b6b6b', fontWeight: 500, letterSpacing: '-0.005em' }}>{label}</span>
            <input ref={inputRef} type={type} value={value} onChange={e => onChange(e.target.value)} onFocus={() => setFocus(true)} onBlur={() => setFocus(false)} placeholder={placeholder} style={{
                appearance: 'none' as const, border: focus ? '1.5px solid #0a0a0a' : '1px solid rgba(10,10,10,0.12)',
                background: '#f5f5f7', padding: '11px 14px', fontSize: 14, fontFamily: SANS, color: '#0a0a0a',
                outline: 'none', borderRadius: 12, transition: 'border-color .15s',
            }} />
        </label>
    );
};


// ════════════════════════════════════════════════════════════════════
const TestLogin = () => {
    const navigate = useNavigate();
    const { userAuthenticated, setUserAuthenticated, setUsername, setUserId, setIsInstructor } = useAuth();
    const [isRegisterMode, setIsRegisterMode] = useState(false);
    const [usernameInput, setUsernameInput] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [email, setEmail] = useState('');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);
    const usernameRef = useRef<HTMLInputElement>(null);

    useEffect(() => { if (userAuthenticated) navigate('/home'); }, [userAuthenticated, navigate]);

    // Inter font now loads globally via public/index.html so every route has it.

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault(); setLoading(true); setError(''); setSuccess('');
        login({ username: usernameInput, password })
            .then(r => { if (r.status===200) { setUserAuthenticated(true); setUsername(r.data.user.username); setUserId(String(r.data.user.id)); setIsInstructor(r.data.user.is_instructor||false); navigate('/home'); } else setError('Login failed.'); })
            .catch(err => setError(err.response?.status===401 ? 'Invalid username or password.' : 'An error occurred.'))
            .finally(() => setLoading(false));
    };

    const handleRegister = (e: React.FormEvent) => {
        e.preventDefault(); setLoading(true); setError(''); setSuccess('');
        if (password!==confirmPassword) { setError('Passwords do not match.'); setLoading(false); return; }
        if (!usernameInput||!password||!email||!firstName||!lastName) { setError('Please fill in all fields.'); setLoading(false); return; }
        register({ username: usernameInput, password, email, first_name: firstName, last_name: lastName } as any)
            .then(r => { if (r.status===201) { setSuccess('Registration successful! Please sign in.'); setIsRegisterMode(false); setConfirmPassword(''); setEmail(''); setFirstName(''); setLastName(''); } else setError('Registration failed.'); })
            .catch(err => { if (err.response?.data?.username) setError('Username already exists.'); else if (err.response?.data?.email) setError('Email already exists.'); else setError('An error occurred.'); })
            .finally(() => setLoading(false));
    };

    const toggleMode = () => { setIsRegisterMode(!isRegisterMode); setUsernameInput(''); setPassword(''); setConfirmPassword(''); setEmail(''); setFirstName(''); setLastName(''); setError(''); setSuccess(''); };

    const handleGuestLogin = () => {
        setLoading(true); setError(''); setSuccess('');
        guestLogin()
            .then(r => { if (r.status === 200 || r.status === 201) { setUserAuthenticated(true); setUsername(r.data.user.username); setUserId(String(r.data.user.id)); setIsInstructor(r.data.user.is_instructor || false); navigate('/home'); } else setError('Could not start guest session.'); })
            .catch(err => { console.error('Guest login error:', err); setError('Could not start guest session.'); })
            .finally(() => setLoading(false));
    };

    return (
        <div style={{ background: '#fff', color: '#0a0a0a', fontFamily: SANS, display: 'flex', flexDirection: 'column', minHeight: '100vh', WebkitFontSmoothing: 'antialiased' as any }}>
            {/* ── Shared frosted-glass sticky navbar ─────────────── */}
            <LandingHeader
                onSignUp={toggleMode}
                signUpLabel={isRegisterMode ? 'Sign in' : 'Sign up'}
            />

            {/* ── Hero: Headline + Login Card ────────────────────── */}
            <section
                className="landing-hero"
                style={{ background: '#f5f5f5' }}
            >
              <div className="landing-hero__inner">
                <div className="landing-hero__text">
                    <h1 style={{ margin: 0, fontFamily: SANS, fontWeight: 700, fontSize: 120, lineHeight: 1.0, letterSpacing: '-0.045em' }}>
                        Create <HighlightWord>compelling</HighlightWord> stories with data<span style={{ color: ACCENT }}>.</span>
                    </h1>
                    <p style={{ marginTop: 28, marginBottom: 0, fontSize: 19, lineHeight: 1.5, color: '#444', maxWidth: 560, letterSpacing: '-0.005em' }}>
                        StoryStudio is a platform which enables educators, entrepreneurs, and students to transform data into compelling narratives, guided by AI annotations, collaboration, and feedback.
                    </p>
                    <div style={{ marginTop: 32, display: 'flex', gap: 12 }}>
                        <a href="http://cast.tahahassan.info" target="_blank" rel="noreferrer" style={{
                            padding: '13px 22px', borderRadius: 999, background: ACCENT, color: '#fff',
                            fontSize: 14, fontWeight: 600, letterSpacing: '-0.005em', textDecoration: 'none',
                        }}>Learn more</a>
                        <button onClick={() => { if (usernameRef.current) { usernameRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' }); setTimeout(() => usernameRef.current?.focus(), 400); } }} style={{
                            padding: '13px 22px', borderRadius: 999, background: 'rgba(10,10,10,0.05)', color: '#0a0a0a',
                            fontSize: 14, fontWeight: 600, letterSpacing: '-0.005em', border: 'none', cursor: 'pointer',
                        }}>Sign in</button>
                    </div>
                </div>

                {/* Right: Login card */}
                <aside className="landing-hero__login">
                    <form onSubmit={isRegisterMode ? handleRegister : handleLogin} style={{
                        background: '#fff', border: '1px solid rgba(10,10,10,0.08)',
                        boxShadow: '0 1px 2px rgba(10,10,10,0.04), 0 16px 48px rgba(10,10,10,0.07)',
                        borderRadius: 24, padding: '30px 30px',
                        display: 'flex', flexDirection: 'column', gap: 16,
                    }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 4 }}>
                            <span style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.02em' }}>{isRegisterMode ? 'Create account' : 'Welcome back'}</span>
                            <span style={{ fontSize: 14, color: '#6b6b6b' }}>{isRegisterMode ? 'Fill in your details to get started.' : 'Sign in to your studio.'}</span>
                        </div>

                        {isRegisterMode && <>
                            <div style={{ display: 'flex', gap: 12 }}>
                                <div style={{ flex: 1, minWidth: 0 }}><FormField label="First name" placeholder="First" value={firstName} onChange={setFirstName} /></div>
                                <div style={{ flex: 1, minWidth: 0 }}><FormField label="Last name" placeholder="Last" value={lastName} onChange={setLastName} /></div>
                            </div>
                            <FormField label="Email" placeholder="you@university.edu" value={email} onChange={setEmail} />
                        </>}
                        <FormField label="Username" placeholder="you@studio.com" value={usernameInput} onChange={setUsernameInput} inputRef={usernameRef} />
                        <FormField label="Password" placeholder="Your password" type="password" value={password} onChange={setPassword} />
                        {isRegisterMode && <FormField label="Confirm password" placeholder="Confirm" type="password" value={confirmPassword} onChange={setConfirmPassword} />}

                        {!isRegisterMode && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#444' }}>
                                    <input type="checkbox" defaultChecked style={{ accentColor: ACCENT, width: 14, height: 14, margin: 0, borderRadius: 4 }} />
                                    Remember me
                                </label>
                                <a href="/forgot-password" style={{ fontSize: 13, color: ACCENT, fontWeight: 500, textDecoration: 'none' }}>Forgot?</a>
                            </div>
                        )}

                        <button type="submit" disabled={loading} style={{
                            background: ACCENT, color: '#fff', border: 'none',
                            padding: '13px 18px', fontSize: 14, fontWeight: 600,
                            letterSpacing: '-0.005em', borderRadius: 999, cursor: 'pointer', marginTop: 4,
                            opacity: loading ? 0.5 : 1,
                        }}>
                            {loading ? (isRegisterMode ? 'Creating account...' : 'Signing in...') : (isRegisterMode ? 'Create account' : 'Sign in')}
                        </button>

                        {error && <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', fontSize: 13, borderRadius: 12 }}>{error}</div>}
                        {success && <div style={{ padding: '10px 14px', background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534', fontSize: 13, borderRadius: 12 }}>{success}</div>}

                        <div style={{ textAlign: 'center', fontSize: 13, color: '#6b6b6b', marginTop: 2 }}>
                            {isRegisterMode ? 'Already have an account? ' : 'New here? '}
                            <button onClick={toggleMode} style={{ color: '#0a0a0a', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', fontSize: 13 }}>
                                {isRegisterMode ? 'Sign in' : 'Sign up for an account'}
                            </button>
                        </div>
                        {!isRegisterMode && (
                            <div style={{ textAlign: 'center', fontSize: 13, color: '#6b6b6b', marginTop: -12 }}>
                                Don't want to create an account?{' '}
                                <button type="button" onClick={handleGuestLogin} disabled={loading} style={{ color: '#0a0a0a', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, opacity: loading ? 0.5 : 1 }}>
                                    Use as guest
                                </button>
                            </div>
                        )}
                    </form>
                </aside>
              </div>
            </section>

            {/* ── Feature bands (one per feature) ─────────────────── */}
            {/* Previous intro tagline (kept commented in case we want it back as a lede above the bands):
            <section style={{ padding: '88px 48px 24px', background: '#f5f5f7' }}>
                <h2 style={{ margin: 0, fontSize: 36, fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1.2, maxWidth: 900 }}>
                    A platform for creating coherent, compelling, and evidence-driven stories to power business meetings, data science education, and research writing.
                </h2>
            </section>
            */}
            {FEATURES.map((f, i) => (
                <FeatureBand key={i} title={f.t} description={f.d} icon={f.icon} highlight={f.highlight} index={i} />
            ))}

            {/* ── Footer ─────────────────────────────────────────── */}
            <footer style={{
                background: '#f5f5f5',
                borderTop: '1px solid rgba(10,10,10,0.06)',
                padding: '56px 32px',
            }}>
              <div style={{ maxWidth: 1280, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 48 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <span style={{ fontSize: 13, color: '#6b6b6b' }}>An NSF-supported collaborative effort by:</span>
                    <div style={{ fontFamily: SANS, fontWeight: 600, fontSize: 40, lineHeight: 1.3, letterSpacing: '-0.02em' }}>
                        University of Alabama<br />
                        University of Maryland Baltimore County<br />
                        SRI International
                    </div>
                    <div style={{ marginTop: 16, display: 'flex', gap: 12 }}>
                        <a href="http://cast.tahahassan.info" target="_blank" rel="noreferrer" style={{
                            padding: '11px 20px', borderRadius: 999, background: ACCENT, color: '#fff',
                            fontSize: 13, fontWeight: 600, letterSpacing: '-0.005em', textDecoration: 'none',
                        }}>Learn more about CAST</a>
                        <a href="https://www.nsf.gov/funding/opportunities/ritel-research-innovative-technologies-enhanced-learning" target="_blank" rel="noreferrer" style={{
                            padding: '11px 20px', borderRadius: 999, background: 'rgba(10,10,10,0.05)', color: '#0a0a0a',
                            fontSize: 13, fontWeight: 600, letterSpacing: '-0.005em', textDecoration: 'none',
                        }}>Learn more about NSF RITEL</a>
                    </div>
                </div>
              </div>
            </footer>

            {/* ── Bottom footer bar ──────────────────────────────── */}
            <div style={{
                borderTop: '1px solid rgba(10,10,10,0.08)', padding: '14px 32px',
                background: 'rgba(255,255,255,0.85)',
            }}>
              <div style={{ maxWidth: 1280, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <a href="mailto:thassan1@ua.edu" style={{ fontSize: 11, color: '#999', textDecoration: 'none' }}>
                    Got questions? <span style={{ textDecoration: 'underline' }}>Contact us.</span>
                </a>
                <span style={{ fontSize: 11, color: '#999' }}>StoryStudio 2026. All rights reserved.</span>
              </div>
            </div>
        </div>
    );
};

export default TestLogin;
