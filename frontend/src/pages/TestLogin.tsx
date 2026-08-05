import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/Auth';
import { login, register, guestLogin } from '../services/api';

const ACCENT = '#00849E';
const SANS = "'Inter', 'Helvetica Neue', Helvetica, Arial, sans-serif";
const MONO = "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace";

// ── Bulb Icon ───────────────────────────────────────────────────────
const Bulb = ({ size = 14, color = 'currentColor' }: { size?: number; color?: string }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block' }}>
        <path d="M9 18h6" /><path d="M10 21h4" />
        <path d="M12 3a6 6 0 0 0-3.5 10.9c.6.45.9.9.9 1.6V18h5.2v-2.5c0-.7.3-1.15.9-1.6A6 6 0 0 0 12 3z" />
        <path d="M12 7v6" />
    </svg>
);

const LogoMark = () => (
    <span style={{ width: 30, height: 30, borderRadius: 9, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: ACCENT, color: '#fff' }}>
        <Bulb size={16} />
    </span>
);

const Wordmark = () => (
    <span style={{ fontFamily: SANS, fontWeight: 600, fontSize: 17, letterSpacing: '-0.015em', lineHeight: 1, color: '#0a0a0a' }}>StoryStudio</span>
);

const Tag = ({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) => (
    <span style={{
        display: 'inline-flex', alignItems: 'center', gap: 8,
        fontSize: 12.5, fontWeight: 500, letterSpacing: '-0.005em',
        color: ACCENT, background: `${ACCENT}14`,
        padding: '6px 12px', borderRadius: 999, fontFamily: SANS,
        ...style,
    }}>
        <span style={{ width: 6, height: 6, background: ACCENT, borderRadius: 999 }} />
        {children}
    </span>
);

// ── Feature Icons ───────────────────────────────────────────────────
const FeatureIcon = ({ kind }: { kind: string }) => {
    const box: React.CSSProperties = { width: 64, height: 64, borderRadius: 16, background: `${ACCENT}12`, display: 'flex', alignItems: 'center', justifyContent: 'center' };
    const svgProps = { width: 32, height: 32, viewBox: '0 0 24 24', fill: 'none', stroke: ACCENT, strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

    if (kind === 'notebook') return (
        <div style={box}>
            <svg {...svgProps}>
                <path d="M4 4h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4" />
                <path d="M4 4v16" />
                <path d="M8 4v16" />
                <path d="M11 8h4" /><path d="M11 12h4" /><path d="M11 16h2" />
                <path d="M4 8h2" /><path d="M4 14h2" />
            </svg>
        </div>
    );
    if (kind === 'graph') return (
        <div style={box}>
            <svg {...svgProps}>
                <circle cx="6" cy="6" r="2" fill={ACCENT} fillOpacity="0.2" />
                <circle cx="18" cy="6" r="2" fill={ACCENT} fillOpacity="0.2" />
                <circle cx="6" cy="18" r="2" fill={ACCENT} fillOpacity="0.2" />
                <circle cx="18" cy="18" r="2" fill={ACCENT} fillOpacity="0.2" />
                <circle cx="12" cy="12" r="2.5" fill={ACCENT} fillOpacity="0.3" />
                <path d="M8 8l2.5 2.5" /><path d="M16 8l-2.5 2.5" />
                <path d="M8 16l2.5-2.5" /><path d="M16 16l-2.5-2.5" />
            </svg>
        </div>
    );
    if (kind === 'plus') return (
        <div style={box}>
            <svg {...svgProps}>
                <path d="M12 5v14" /><path d="M5 12h14" />
            </svg>
        </div>
    );
    if (kind === 'chain') return (
        <div style={box}>
            <svg {...svgProps}>
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
            </svg>
        </div>
    );
    if (kind === 'reply') return (
        <div style={box}>
            <svg {...svgProps}>
                <polyline points="9 17 4 12 9 7" />
                <path d="M20 18v-2a4 4 0 0 0-4-4H4" />
            </svg>
        </div>
    );
    return <div style={box} />;
};

// ── Mini Chart ──────────────────────────────────────────────────────
const MiniChart = ({ kind = 'lines' }: { kind?: 'lines' | 'bars' | 'area' }) => {
    const W = 380, H = 150, ins = { t: 14, r: 12, b: 18, l: 12 };
    const y = (v: number) => H - ins.b - (v / 100) * (H - ins.t - ins.b);
    const lineData = [[12,28,22,40,36,58,52,72,66,84,80,96],[40,36,44,30,38,28,36,26,34,22,30,22]];
    const bars = [22,36,28,48,42,60,54,72,68,82];
    const area = [30,26,38,32,50,44,60,54,70,64,78,72];
    return (
        <div style={{ border: '1px solid rgba(10,10,10,0.06)', borderRadius: 16, padding: 8, background: '#fff' }}>
            <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block' }}>
                <line x1={ins.l} y1={H-ins.b} x2={W-ins.r} y2={H-ins.b} stroke="#0a0a0a" strokeWidth="1" />
                <line x1={ins.l} y1={ins.t} x2={ins.l} y2={H-ins.b} stroke="#0a0a0a" strokeWidth="1" />
                {[25,50,75].map(g => <line key={g} x1={ins.l} y1={y(g)} x2={W-ins.r} y2={y(g)} stroke="#e6e6e6" strokeDasharray="2 3" />)}
                {kind==='lines' && lineData.map((s,si) => { const step=(W-ins.l-ins.r)/(s.length-1); return <path key={si} d={s.map((v,i)=>`${i===0?'M':'L'} ${ins.l+i*step} ${y(v)}`).join(' ')} fill="none" stroke={si===0?ACCENT:'#0a0a0a'} strokeWidth={si===0?2:1} />; })}
                {kind==='bars' && (()=>{ const step=(W-ins.l-ins.r)/bars.length; return bars.map((v,i)=><rect key={i} x={ins.l+i*step+step*0.18} y={y(v)} width={step*0.64} height={H-ins.b-y(v)} fill={i===bars.length-1?ACCENT:'#0a0a0a'} rx={3} />); })()}
                {kind==='area' && (()=>{ const step=(W-ins.l-ins.r)/(area.length-1); const top=area.map((v,i)=>`${i===0?'M':'L'} ${ins.l+i*step} ${y(v)}`).join(' '); return <><path d={top+` L ${ins.l+(area.length-1)*step} ${H-ins.b} L ${ins.l} ${H-ins.b} Z`} fill={ACCENT} fillOpacity="0.18" /><path d={top} fill="none" stroke={ACCENT} strokeWidth="2" /></>; })()}
            </svg>
        </div>
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

const NAV_LINKS = [
    { label: 'About', href: 'http://cast.tahahassan.info' },
    { label: 'Docs', href: '/tutorials' },
];

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

    // Load Inter font
    useEffect(() => {
        const link = document.createElement('link');
        link.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap';
        link.rel = 'stylesheet';
        document.head.appendChild(link);
        return () => { document.head.removeChild(link); };
    }, []);

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
            {/* ── Navbar (frosted glass, sticky) ─────────────────── */}
            <header style={{
                background: 'rgba(255,255,255,0.85)', backdropFilter: 'saturate(180%) blur(20px)', WebkitBackdropFilter: 'saturate(180%) blur(20px)',
                borderBottom: '1px solid rgba(10,10,10,0.08)', padding: '14px 32px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                position: 'sticky', top: 0, zIndex: 10,
            }}>
                <a href="/login" style={{ display: 'flex', alignItems: 'center', gap: 11, textDecoration: 'none' }}><LogoMark /><Wordmark /></a>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {NAV_LINKS.map(l => (
                        <a key={l.label} href={l.href} target={l.href.startsWith('http')?'_blank':undefined} rel={l.href.startsWith('http')?'noreferrer':undefined} style={{
                            fontSize: 13.5, fontWeight: 500, letterSpacing: '-0.005em', color: '#1a1a1a',
                            padding: '8px 14px', borderRadius: 999, textDecoration: 'none',
                        }}>{l.label}</a>
                    ))}
                    <button onClick={toggleMode} style={{
                        padding: '9px 18px', borderRadius: 999, border: 'none',
                        fontSize: 13.5, fontWeight: 600, letterSpacing: '-0.005em',
                        background: ACCENT, color: '#fff', cursor: 'pointer',
                    }}>{isRegisterMode ? 'Sign in' : 'Sign up'}</button>
                </div>
            </header>

            {/* ── Hero: Headline + Login Card ────────────────────── */}
            <section style={{
                padding: '72px 48px 88px',
                display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 380px', gap: 64, alignItems: 'start',
                background: 'linear-gradient(180deg,#fff 0%,#fafafc 100%)',
            }}>
                <div>
                    <h1 style={{ margin: 0, fontFamily: SANS, fontWeight: 700, fontSize: 120, lineHeight: 1.0, letterSpacing: '-0.045em' }}>
                        Create <mark style={{ background: ACCENT, color: '#fff', borderRadius: 8, padding: '0 8px' }}>compelling</mark> stories with data<span style={{ color: ACCENT }}>.</span>
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
                <aside>
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
            </section>

            {/* ── Features carousel ──────────────────────────────── */}
            <section style={{ padding: '88px 0 96px', background: '#f5f5f7' }}>
                <div style={{ padding: '0 48px', marginBottom: 48 }}>
                    <h2 style={{ margin: 0, fontSize: 36, fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1.2, maxWidth: 900 }}>
                        A platform for creating coherent, compelling, and evidence-driven stories to power business meetings, data science education, and research writing.
                    </h2>
                </div>
                <div style={{ display: 'flex', gap: 20, overflowX: 'auto', padding: '0 48px 16px', scrollSnapType: 'x mandatory' }}>
                    {([
                        { t: 'Integrated with JupyterHub', d: 'Import visuals and annotations from Jupyter notebooks into an interactive workspace to filter, annotate and group.', icon: 'notebook' },
                        { t: 'Structure Narratives', d: 'Use narrative structure scaffolds to sort data insights into narratives.', icon: 'graph' },
                        { t: 'Synthesize Stories', d: 'Use AI to synthesize notes, visuals, and annotations into a compelling data-driven story. Support your creative voice.', icon: 'plus' },
                        { t: 'Collaborate with Classmates', d: 'Share your workspace with up to three classmates to collaboratively craft data-driven stories.', icon: 'chain' },
                        { t: 'Receive Feedback', d: 'Provide and receive AI or instructor feedback seamlessly during a data-storytelling workflow.', icon: 'reply' },
                    ]).map((x, i) => (
                        <article key={i} style={{
                            display: 'flex', flexDirection: 'column', gap: 18,
                            padding: 26, borderRadius: 26, background: '#fff',
                            border: '1px solid rgba(10,10,10,0.06)',
                            boxShadow: '0 1px 2px rgba(10,10,10,0.03), 0 8px 28px rgba(10,10,10,0.04)',
                            minWidth: 280, maxWidth: 300, flexShrink: 0, scrollSnapAlign: 'start',
                        }}>
                            <FeatureIcon kind={x.icon} />
                            <div style={{ fontSize: 20, fontWeight: 600, letterSpacing: '-0.02em' }}>{x.t}</div>
                            <div style={{ fontSize: 14, lineHeight: 1.55, color: '#555' }}>{x.d}</div>
                        </article>
                    ))}
                </div>
            </section>

            {/* ── Footer ─────────────────────────────────────────── */}
            <footer style={{
                background: 'linear-gradient(180deg,#fff 0%,#f5f5f7 100%)',
                borderTop: '1px solid rgba(10,10,10,0.06)',
                padding: '56px 32px',
                display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 48,
            }}>
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
            </footer>

            {/* ── Bottom footer bar ──────────────────────────────── */}
            <div style={{
                borderTop: '1px solid rgba(10,10,10,0.08)', padding: '14px 32px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                background: 'rgba(255,255,255,0.85)',
            }}>
                <a href="mailto:thassan1@ua.edu" style={{ fontSize: 11, color: '#999', textDecoration: 'none' }}>
                    Got questions? <span style={{ textDecoration: 'underline' }}>Contact us.</span>
                </a>
                <span style={{ fontSize: 11, color: '#999' }}>StoryStudio 2026. All rights reserved.</span>
            </div>
        </div>
    );
};

export default TestLogin;
