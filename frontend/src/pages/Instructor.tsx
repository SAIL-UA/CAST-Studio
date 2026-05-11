import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/Auth';
import {
    getFeatureFlags, updateFeatureFlags, getInstructorUsers,
    exportWorkspaceReport, getEngagementReport,
    listResearchStudies, createResearchStudy, updateResearchStudy, deleteResearchStudy,
    createStudyReferralCode, updateStudyReferralCode, deleteStudyReferralCode,
    type ResearchStudy,
} from '../services/api';
import Header from '../components/Header';
import CompactSidebar from '../components/CompactSidebar';
import Footer from '../components/Footer';

type UserRow = {
    id: string;
    username: string;
    email: string;
    first_name: string;
    last_name: string;
    is_instructor: boolean;
    last_modified: string | null;
};

type SortColumn = string;
type SortDirection = 'asc' | 'desc';

const formatDate = (iso: string | null) => {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        + ', '
        + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
};

const Instructor = () => {
    const navigate = useNavigate();
    const { userAuthenticated, isInstructor } = useAuth();

    const [leftMenuOpen, setLeftMenuOpen] = useState(false);
    const [annotateWithAI, setAnnotateWithAI] = useState(true);
    const [selectWithAI, setSelectWithAI] = useState(true);
    const [users, setUsers] = useState<UserRow[]>([]);
    const [alertModal, setAlertModal] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [engagementData, setEngagementData] = useState<any[] | null>(null);
    const [engagementCategories, setEngagementCategories] = useState<string[]>([]);
    const [activeTab, setActiveTab] = useState<'accounts' | 'engagement' | 'studies'>('accounts');
    const [sortColumn, setSortColumn] = useState<SortColumn>('last_name');
    const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

    // Research studies state
    const [studies, setStudies] = useState<ResearchStudy[]>([]);
    const [studiesLoading, setStudiesLoading] = useState(false);
    const [newStudyName, setNewStudyName] = useState('');
    const [newStudyAnnotate, setNewStudyAnnotate] = useState(true);
    const [newStudySelect, setNewStudySelect] = useState(true);
    const [newStudyFeedback, setNewStudyFeedback] = useState(true);
    const [creatingStudy, setCreatingStudy] = useState(false);
    const [busyStudyId, setBusyStudyId] = useState<string | null>(null);

    const refreshStudies = async () => {
        setStudiesLoading(true);
        try {
            const list = await listResearchStudies();
            setStudies(list);
        } catch (err) {
            console.error('Error loading studies:', err);
            setAlertModal('Could not load research studies.');
        } finally {
            setStudiesLoading(false);
        }
    };

    useEffect(() => {
        if (isInstructor && activeTab === 'studies' && studies.length === 0 && !studiesLoading) {
            refreshStudies();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isInstructor, activeTab]);

    const handleCreateStudy = async () => {
        const name = newStudyName.trim();
        if (!name) {
            setAlertModal('Please enter a study name.');
            return;
        }
        setCreatingStudy(true);
        try {
            const created = await createResearchStudy({
                name,
                annotate_with_ai: newStudyAnnotate,
                select_with_ai: newStudySelect,
                ai_feedback: newStudyFeedback,
            });
            setStudies(prev => [created, ...prev]);
            setNewStudyName('');
            setNewStudyAnnotate(true);
            setNewStudySelect(true);
            setNewStudyFeedback(true);
        } catch (err) {
            console.error('Error creating study:', err);
            setAlertModal('Could not create study.');
        } finally {
            setCreatingStudy(false);
        }
    };

    const handlePatchStudy = async (studyId: string, patch: Partial<ResearchStudy>) => {
        setBusyStudyId(studyId);
        try {
            const updated = await updateResearchStudy(studyId, patch as any);
            setStudies(prev => prev.map(s => s.id === studyId ? { ...updated, referral_codes: s.referral_codes } : s));
        } catch (err) {
            console.error('Error updating study:', err);
            setAlertModal('Could not update study.');
        } finally {
            setBusyStudyId(null);
        }
    };

    const handleDeleteStudy = async (studyId: string) => {
        if (!window.confirm('Delete this study? Its referral codes will be removed and participants will be detached. This cannot be undone.')) return;
        setBusyStudyId(studyId);
        try {
            await deleteResearchStudy(studyId);
            setStudies(prev => prev.filter(s => s.id !== studyId));
        } catch (err) {
            console.error('Error deleting study:', err);
            setAlertModal('Could not delete study.');
        } finally {
            setBusyStudyId(null);
        }
    };

    const handleGenerateCode = async (studyId: string) => {
        setBusyStudyId(studyId);
        try {
            const code = await createStudyReferralCode(studyId);
            setStudies(prev => prev.map(s => s.id === studyId
                ? { ...s, referral_codes: [code, ...s.referral_codes] }
                : s));
        } catch (err) {
            console.error('Error creating code:', err);
            setAlertModal('Could not generate a referral code.');
        } finally {
            setBusyStudyId(null);
        }
    };

    const handleToggleCode = async (studyId: string, codeId: string, is_active: boolean) => {
        setBusyStudyId(studyId);
        try {
            const updated = await updateStudyReferralCode(codeId, { is_active });
            setStudies(prev => prev.map(s => s.id === studyId
                ? { ...s, referral_codes: s.referral_codes.map(c => c.id === codeId ? updated : c) }
                : s));
        } catch (err) {
            console.error('Error toggling code:', err);
            setAlertModal('Could not update the code.');
        } finally {
            setBusyStudyId(null);
        }
    };

    const handleDeleteCode = async (studyId: string, codeId: string) => {
        if (!window.confirm('Delete this referral code? It will no longer work for signup.')) return;
        setBusyStudyId(studyId);
        try {
            await deleteStudyReferralCode(codeId);
            setStudies(prev => prev.map(s => s.id === studyId
                ? { ...s, referral_codes: s.referral_codes.filter(c => c.id !== codeId) }
                : s));
        } catch (err) {
            console.error('Error deleting code:', err);
            setAlertModal('Could not delete the code.');
        } finally {
            setBusyStudyId(null);
        }
    };

    const copyToClipboard = async (text: string) => {
        try {
            await navigator.clipboard.writeText(text);
            setAlertModal(`Copied "${text}" to clipboard.`);
        } catch {
            setAlertModal('Could not copy to clipboard.');
        }
    };

    // Redirect non-instructor users
    useEffect(() => {
        if (!userAuthenticated) {
            navigate('/login');
        } else if (!isInstructor) {
            navigate('/home');
        }
    }, [userAuthenticated, isInstructor, navigate]);

    // Load feature flags and users
    useEffect(() => {
        const load = async () => {
            try {
                const flags = await getFeatureFlags();
                setAnnotateWithAI(flags.annotate_with_ai ?? true);
                setSelectWithAI(flags.select_with_ai ?? true);
            } catch (err) {
                console.error('Error loading feature flags:', err);
            }

            try {
                const data = await getInstructorUsers();
                setUsers(data.users || []);
            } catch (err) {
                console.error('Error loading users:', err);
            }
        };

        if (isInstructor) load();
    }, [isInstructor]);

    const handleSave = async () => {
        setSaving(true);
        try {
            await updateFeatureFlags({
                annotate_with_ai: annotateWithAI,
                select_with_ai: selectWithAI,
            });
            setAlertModal('Settings saved successfully.');
        } catch (err: any) {
            if (err?.response?.status === 403) {
                setAlertModal('Not authorized.');
            } else {
                setAlertModal('An error occurred while saving settings.');
            }
        } finally {
            setSaving(false);
        }
    };

    const handleSort = (column: SortColumn) => {
        if (sortColumn === column) {
            setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortColumn(column);
            setSortDirection('asc');
        }
    };

    const sortedUsers = [...users].sort((a, b) => {
        const dir = sortDirection === 'asc' ? 1 : -1;
        let aVal: string | number;
        let bVal: string | number;

        switch (sortColumn) {
            case 'username':
                aVal = a.username.toLowerCase();
                bVal = b.username.toLowerCase();
                break;
            case 'email':
                aVal = a.email.toLowerCase();
                bVal = b.email.toLowerCase();
                break;
            case 'last_name':
                aVal = `${a.last_name} ${a.first_name}`.toLowerCase();
                bVal = `${b.last_name} ${b.first_name}`.toLowerCase();
                break;
            case 'is_instructor':
                aVal = a.is_instructor ? 0 : 1;
                bVal = b.is_instructor ? 0 : 1;
                break;
            case 'last_modified':
                aVal = a.last_modified || '';
                bVal = b.last_modified || '';
                break;
            default:
                // Handle numeric columns (categories, Total) from engagement data
                aVal = (a as any)[sortColumn] ?? 0;
                bVal = (b as any)[sortColumn] ?? 0;
                break;
        }

        if (aVal < bVal) return -1 * dir;
        if (aVal > bVal) return 1 * dir;
        return 0;
    });

    const SortArrow = ({ column }: { column: SortColumn }) => {
        if (sortColumn !== column) return <span className="text-bama-crimson ml-1">{'\u2195'}</span>;
        return <span className="text-bama-crimson ml-1 text-[0.6em]">{sortDirection === 'asc' ? '\u25B2' : '\u25BC'}</span>;
    };

    const thClass = "text-left p-3 font-medium text-grey-darkest cursor-pointer select-none hover:bg-grey-light transition-colors duration-100 whitespace-nowrap";

    if (!isInstructor) return null;

    return (
        <>
            <Header onMenuOpen={() => setLeftMenuOpen(prev => !prev)} floating menuOpen={leftMenuOpen} subtitle="Instructor" pillLink="/instructor" />

            {/* Left Panel */}
            {leftMenuOpen && (
                <>
                    <div className="fixed inset-0 bg-black bg-opacity-30 z-[400]" onClick={() => setLeftMenuOpen(false)} />
                    <div className="fixed top-0 left-0 bottom-0 w-1/5 min-w-[320px] bg-grey-lighter-2 shadow-xl z-[401] overflow-y-auto pt-8">
                        <CompactSidebar setCenterNarrativePatternsOpen={() => setLeftMenuOpen(false)} />
                        <div id="footer" className="flex flex-col justify-start items-start mb-6">
                            <Footer />
                        </div>
                    </div>
                </>
            )}

            <div className="min-h-screen bg-grey-lighter pt-20 px-8">
                {/* Feature Flags Section */}
                <div className="max-w-2xl mx-auto">
                    <button
                        onClick={() => navigate('/home')}
                        className="text-sm text-bama-crimson hover:underline mb-4 inline-block"
                    >
                        ← Back to Workspace
                    </button>

                    <h2 className="text-lg font-semibold text-grey-darkest mb-4">Select to enable StoryStudio features:</h2>
                    <div className="bg-white rounded-lg p-6 shadow-sm space-y-4">
                        <label className="flex items-center gap-3 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={annotateWithAI}
                                onChange={(e) => setAnnotateWithAI(e.target.checked)}
                                className="w-4 h-4 accent-bama-crimson"
                            />
                            <span className="text-sm text-grey-darkest">Annotate visuals with AI</span>
                        </label>
                        <label className="flex items-center gap-3 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={selectWithAI}
                                onChange={(e) => setSelectWithAI(e.target.checked)}
                                className="w-4 h-4 accent-bama-crimson"
                            />
                            <span className="text-sm text-grey-darkest">Select narrative with AI</span>
                        </label>
                        <div className="pt-2">
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="bg-bama-crimson text-sm text-white rounded-full px-4 py-1.5 hover:-translate-y-[.05rem] hover:shadow-lg hover:brightness-95 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {saving ? 'Saving...' : 'Save Settings'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Users Section — wider */}
                <div className="max-w-5xl mx-auto mt-8">
                    {/* Tabs */}
                    <div className="flex items-end justify-between mb-0">
                        <div className="flex">
                            <button
                                onClick={() => setActiveTab('accounts')}
                                className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors duration-150 ${
                                    activeTab === 'accounts'
                                        ? 'bg-white text-grey-darkest border border-grey-light border-b-white'
                                        : 'bg-grey-lighter text-grey-dark hover:text-grey-darkest'
                                }`}
                            >
                                User Accounts
                            </button>
                            <button
                                onClick={() => setActiveTab('engagement')}
                                className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors duration-150 ${
                                    activeTab === 'engagement'
                                        ? 'bg-white text-grey-darkest border border-grey-light border-b-white'
                                        : 'bg-grey-lighter text-grey-dark hover:text-grey-darkest'
                                }`}
                            >
                                User Engagement
                            </button>
                            <button
                                onClick={() => setActiveTab('studies')}
                                className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors duration-150 ${
                                    activeTab === 'studies'
                                        ? 'bg-white text-grey-darkest border border-grey-light border-b-white'
                                        : 'bg-grey-lighter text-grey-dark hover:text-grey-darkest'
                                }`}
                            >
                                Research Studies
                            </button>
                        </div>
                        {activeTab === 'engagement' && (
                            <div className="flex items-center gap-2 mb-1">
                                <button
                                    onClick={async () => {
                                        setRefreshing(true);
                                        try {
                                            const data = await getEngagementReport();
                                            setEngagementData(data.users || []);
                                            setEngagementCategories(data.categories || []);
                                        } catch (err) {
                                            console.error('Error loading engagement data:', err);
                                            setAlertModal('An error occurred while loading engagement data.');
                                        } finally {
                                            setRefreshing(false);
                                        }
                                    }}
                                    disabled={refreshing}
                                    className="bg-bama-crimson text-sm text-white rounded-full px-4 py-1.5 hover:-translate-y-[.05rem] hover:shadow-lg hover:brightness-95 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {refreshing ? 'Refreshing...' : 'Refresh'}
                                </button>
                                <button
                                    onClick={async () => {
                                        setExporting(true);
                                        try {
                                            await exportWorkspaceReport();
                                        } catch (err) {
                                            console.error('Error exporting report:', err);
                                            setAlertModal('An error occurred while exporting the report.');
                                        } finally {
                                            setExporting(false);
                                        }
                                    }}
                                    disabled={exporting}
                                    className="bg-bama-crimson text-sm text-white rounded-full px-4 py-1.5 hover:-translate-y-[.05rem] hover:shadow-lg hover:brightness-95 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {exporting ? 'Exporting...' : 'Export User Engagement Report'}
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Tab content */}
                    {activeTab === 'accounts' && (
                        <div className="bg-white rounded-b-lg rounded-tr-lg shadow-sm border border-grey-light overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-grey-lighter border-b border-grey-lightest">
                                        <th className={thClass} onClick={() => handleSort('username')}>
                                            Username<SortArrow column="username" />
                                        </th>
                                        <th className={thClass} onClick={() => handleSort('email')}>
                                            Email<SortArrow column="email" />
                                        </th>
                                        <th className={thClass} onClick={() => handleSort('last_name')}>
                                            Name<SortArrow column="last_name" />
                                        </th>
                                        <th className={thClass} onClick={() => handleSort('is_instructor')}>
                                            Role<SortArrow column="is_instructor" />
                                        </th>
                                        <th className={thClass} onClick={() => handleSort('last_modified')}>
                                            Last Modified<SortArrow column="last_modified" />
                                        </th>
                                        <th className="text-left p-3 font-medium text-grey-darkest">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sortedUsers.map((user) => (
                                        <tr key={user.id} className="border-b border-grey-lightest hover:bg-grey-lighter">
                                            <td className="p-3 text-grey-darkest">{user.username}</td>
                                            <td className="p-3 text-grey-darkest">{user.email}</td>
                                            <td className="p-3 text-grey-darkest">{user.first_name} {user.last_name}</td>
                                            <td className="p-3">
                                                <span className={`text-xs px-2 py-0.5 rounded-full ${user.is_instructor ? 'bg-bama-crimson text-white' : 'bg-grey-lighter text-grey-darkest'}`}>
                                                    {user.is_instructor ? 'Instructor' : 'Student'}
                                                </span>
                                            </td>
                                            <td className="p-3 text-grey-darkest whitespace-nowrap">{formatDate(user.last_modified)}</td>
                                            <td className="p-3">
                                                {!user.is_instructor && (
                                                    <button
                                                        onClick={() => window.open(`/workspace/${user.id}`, '_blank')}
                                                        className="bg-bama-crimson text-xs text-white rounded-full px-3 py-1 hover:brightness-95 transition duration-200"
                                                    >
                                                        View Workspace
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                    {users.length === 0 && (
                                        <tr>
                                            <td colSpan={6} className="p-3 text-center text-grey-dark">No users found.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {activeTab === 'studies' && (
                        <div className="bg-white rounded-b-lg rounded-tr-lg shadow-sm border border-grey-light min-h-[200px] p-6 space-y-6">
                            {/* Create new study */}
                            <div className="border border-grey-light rounded-lg p-4">
                                <h3 className="text-sm font-semibold text-grey-darkest mb-3">Create a new study</h3>
                                <div className="flex flex-wrap items-end gap-3">
                                    <div className="flex flex-col flex-1 min-w-[220px]">
                                        <label className="text-xs text-grey-dark mb-1">Study name</label>
                                        <input
                                            type="text"
                                            value={newStudyName}
                                            onChange={(e) => setNewStudyName(e.target.value)}
                                            placeholder="e.g. Spring 2026 Pilot"
                                            className="border border-grey-light rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-bama-crimson"
                                        />
                                    </div>
                                    <label className="flex items-center gap-2 text-sm text-grey-darkest cursor-pointer">
                                        <input type="checkbox" className="w-4 h-4 accent-bama-crimson" checked={newStudyAnnotate} onChange={(e) => setNewStudyAnnotate(e.target.checked)} />
                                        Annotate w/ AI
                                    </label>
                                    <label className="flex items-center gap-2 text-sm text-grey-darkest cursor-pointer">
                                        <input type="checkbox" className="w-4 h-4 accent-bama-crimson" checked={newStudySelect} onChange={(e) => setNewStudySelect(e.target.checked)} />
                                        Select w/ AI
                                    </label>
                                    <label className="flex items-center gap-2 text-sm text-grey-darkest cursor-pointer">
                                        <input type="checkbox" className="w-4 h-4 accent-bama-crimson" checked={newStudyFeedback} onChange={(e) => setNewStudyFeedback(e.target.checked)} />
                                        AI feedback
                                    </label>
                                    <button
                                        onClick={handleCreateStudy}
                                        disabled={creatingStudy || !newStudyName.trim()}
                                        className="bg-bama-crimson text-sm text-white rounded-full px-4 py-1.5 hover:brightness-95 transition disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {creatingStudy ? 'Creating...' : 'Create study'}
                                    </button>
                                </div>
                            </div>

                            {/* Existing studies */}
                            {studiesLoading && studies.length === 0 ? (
                                <p className="text-sm text-grey-dark text-center">Loading studies...</p>
                            ) : studies.length === 0 ? (
                                <p className="text-sm text-grey-dark text-center">No studies yet. Create one above.</p>
                            ) : (
                                <div className="space-y-4">
                                    {studies.map((study) => {
                                        const busy = busyStudyId === study.id;
                                        return (
                                            <div key={study.id} className={`border rounded-lg p-4 ${study.is_active ? 'border-grey-light' : 'border-grey-light bg-grey-lighter opacity-80'}`}>
                                                <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                                                    <div>
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <h4 className="text-base font-semibold text-grey-darkest">{study.name}</h4>
                                                            {!study.is_active && (
                                                                <span className="text-xs px-2 py-0.5 rounded-full bg-grey-light text-grey-darkest">Inactive</span>
                                                            )}
                                                        </div>
                                                        <div className="text-xs text-grey-dark mt-1">
                                                            Created by {study.created_by_username ?? '—'} · {formatDate(study.created_at)} · {study.participants_count} participant{study.participants_count === 1 ? '' : 's'}
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            onClick={() => handlePatchStudy(study.id, { is_active: !study.is_active })}
                                                            disabled={busy}
                                                            className="text-xs rounded-full px-3 py-1 border border-grey-light text-grey-darkest hover:bg-grey-lighter disabled:opacity-50"
                                                        >
                                                            {study.is_active ? 'Deactivate' : 'Activate'}
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteStudy(study.id)}
                                                            disabled={busy}
                                                            className="text-xs rounded-full px-3 py-1 bg-bama-crimson text-white hover:brightness-95 disabled:opacity-50"
                                                        >
                                                            Delete
                                                        </button>
                                                    </div>
                                                </div>

                                                <div className="flex flex-wrap gap-6 mb-4">
                                                    <label className="flex items-center gap-2 text-sm text-grey-darkest cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            className="w-4 h-4 accent-bama-crimson"
                                                            checked={study.annotate_with_ai}
                                                            disabled={busy}
                                                            onChange={(e) => handlePatchStudy(study.id, { annotate_with_ai: e.target.checked })}
                                                        />
                                                        Annotate visuals with AI
                                                    </label>
                                                    <label className="flex items-center gap-2 text-sm text-grey-darkest cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            className="w-4 h-4 accent-bama-crimson"
                                                            checked={study.select_with_ai}
                                                            disabled={busy}
                                                            onChange={(e) => handlePatchStudy(study.id, { select_with_ai: e.target.checked })}
                                                        />
                                                        Select narrative with AI
                                                    </label>
                                                    <label className="flex items-center gap-2 text-sm text-grey-darkest cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            className="w-4 h-4 accent-bama-crimson"
                                                            checked={study.ai_feedback}
                                                            disabled={busy}
                                                            onChange={(e) => handlePatchStudy(study.id, { ai_feedback: e.target.checked })}
                                                        />
                                                        AI feedback
                                                    </label>
                                                </div>

                                                <div className="border-t border-grey-light pt-3 mb-4">
                                                    <h5 className="text-sm font-medium text-grey-darkest mb-2">
                                                        Participants
                                                        <span className="text-xs text-grey-dark font-normal ml-2">({study.participants.length})</span>
                                                    </h5>
                                                    {study.participants.length === 0 ? (
                                                        <p className="text-xs text-grey-dark">No participants yet. Share a referral code below to enroll users.</p>
                                                    ) : (
                                                        <div className="overflow-x-auto border border-grey-light rounded">
                                                            <table className="w-full text-xs">
                                                                <thead>
                                                                    <tr className="bg-grey-lighter border-b border-grey-light">
                                                                        <th className="text-left p-2 font-medium text-grey-darkest">Username</th>
                                                                        <th className="text-left p-2 font-medium text-grey-darkest">Name</th>
                                                                        <th className="text-left p-2 font-medium text-grey-darkest">Email</th>
                                                                        <th className="text-left p-2 font-medium text-grey-darkest">Role</th>
                                                                        <th className="text-left p-2 font-medium text-grey-darkest whitespace-nowrap">Joined</th>
                                                                        <th className="text-left p-2 font-medium text-grey-darkest">Actions</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody>
                                                                    {study.participants.map((p) => (
                                                                        <tr key={p.id} className="border-b border-grey-lightest last:border-b-0 hover:bg-grey-lighter">
                                                                            <td className="p-2 text-grey-darkest">{p.username}</td>
                                                                            <td className="p-2 text-grey-darkest whitespace-nowrap">{p.first_name} {p.last_name}</td>
                                                                            <td className="p-2 text-grey-darkest">{p.email}</td>
                                                                            <td className="p-2">
                                                                                <span className={`text-[10px] px-2 py-0.5 rounded-full ${p.is_instructor ? 'bg-bama-crimson text-white' : 'bg-grey-lighter text-grey-darkest'}`}>
                                                                                    {p.is_instructor ? 'Instructor' : 'Student'}
                                                                                </span>
                                                                            </td>
                                                                            <td className="p-2 text-grey-darkest whitespace-nowrap">{formatDate(p.date_joined)}</td>
                                                                            <td className="p-2">
                                                                                {!p.is_instructor && (
                                                                                    <button
                                                                                        onClick={() => window.open(`/workspace/${p.id}`, '_blank')}
                                                                                        className="bg-bama-crimson text-[11px] text-white rounded-full px-2.5 py-0.5 hover:brightness-95 transition"
                                                                                    >
                                                                                        View Workspace
                                                                                    </button>
                                                                                )}
                                                                            </td>
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="border-t border-grey-light pt-3">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <h5 className="text-sm font-medium text-grey-darkest">Referral codes</h5>
                                                        <button
                                                            onClick={() => handleGenerateCode(study.id)}
                                                            disabled={busy}
                                                            className="text-xs rounded-full px-3 py-1 bg-bama-crimson text-white hover:brightness-95 disabled:opacity-50"
                                                        >
                                                            Generate new code
                                                        </button>
                                                    </div>
                                                    {study.referral_codes.length === 0 ? (
                                                        <p className="text-xs text-grey-dark">No codes yet. Generate one to share with participants.</p>
                                                    ) : (
                                                        <ul className="space-y-1">
                                                            {study.referral_codes.map((c) => (
                                                                <li key={c.id} className="flex items-center justify-between gap-2 text-sm">
                                                                    <div className="flex items-center gap-2">
                                                                        <code className="font-mono px-2 py-0.5 bg-grey-lighter rounded text-grey-darkest">{c.code}</code>
                                                                        <span className={`text-xs px-2 py-0.5 rounded-full ${c.is_active && c.is_redeemable ? 'bg-green-100 text-green-800' : 'bg-grey-light text-grey-darkest'}`}>
                                                                            {c.is_active && c.is_redeemable ? 'Active' : 'Inactive'}
                                                                        </span>
                                                                        <span className="text-xs text-grey-dark">
                                                                            {c.uses_count} use{c.uses_count === 1 ? '' : 's'}{c.max_uses != null ? ` / ${c.max_uses}` : ''}
                                                                        </span>
                                                                    </div>
                                                                    <div className="flex items-center gap-2">
                                                                        <button
                                                                            onClick={() => copyToClipboard(c.code)}
                                                                            className="text-xs px-2 py-0.5 rounded border border-grey-light text-grey-darkest hover:bg-grey-lighter"
                                                                        >
                                                                            Copy
                                                                        </button>
                                                                        <button
                                                                            onClick={() => handleToggleCode(study.id, c.id, !c.is_active)}
                                                                            disabled={busy}
                                                                            className="text-xs px-2 py-0.5 rounded border border-grey-light text-grey-darkest hover:bg-grey-lighter disabled:opacity-50"
                                                                        >
                                                                            {c.is_active ? 'Disable' : 'Enable'}
                                                                        </button>
                                                                        <button
                                                                            onClick={() => handleDeleteCode(study.id, c.id)}
                                                                            disabled={busy}
                                                                            className="text-xs px-2 py-0.5 rounded text-bama-crimson hover:underline disabled:opacity-50"
                                                                        >
                                                                            Delete
                                                                        </button>
                                                                    </div>
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'engagement' && (
                        <div className="bg-white rounded-b-lg rounded-tr-lg shadow-sm border border-grey-light overflow-x-auto min-h-[200px]">
                            {engagementData === null ? (
                                <p className="text-sm text-grey-dark text-center p-6">Click "Refresh" to load engagement data.</p>
                            ) : engagementData.length === 0 ? (
                                <p className="text-sm text-grey-dark text-center p-6">No engagement data found.</p>
                            ) : (
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="bg-grey-lighter border-b border-grey-lightest">
                                            <th className={thClass} onClick={() => handleSort('username')}>
                                                Username<SortArrow column="username" />
                                            </th>
                                            <th className={thClass} onClick={() => handleSort('last_name')}>
                                                Name<SortArrow column="last_name" />
                                            </th>
                                            <th className={thClass} onClick={() => handleSort('Total')}>
                                                Total<SortArrow column="Total" />
                                            </th>
                                            {engagementCategories.map((cat) => (
                                                <th key={cat} className={`${thClass} text-xs`} onClick={() => handleSort(cat)}>
                                                    {cat}<SortArrow column={cat} />
                                                </th>
                                            ))}
                                            <th className={thClass} onClick={() => handleSort('last_modified')}>
                                                Last Modified<SortArrow column="last_modified" />
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {[...engagementData]
                                            .sort((a, b) => {
                                                const dir = sortDirection === 'asc' ? 1 : -1;
                                                let aVal: string | number, bVal: string | number;
                                                if (sortColumn === 'username') {
                                                    aVal = a.username.toLowerCase();
                                                    bVal = b.username.toLowerCase();
                                                } else if (sortColumn === 'last_name') {
                                                    aVal = `${a.last_name} ${a.first_name}`.toLowerCase();
                                                    bVal = `${b.last_name} ${b.first_name}`.toLowerCase();
                                                } else if (sortColumn === 'last_modified') {
                                                    aVal = a.last_modified || '';
                                                    bVal = b.last_modified || '';
                                                } else {
                                                    aVal = a[sortColumn] ?? 0;
                                                    bVal = b[sortColumn] ?? 0;
                                                }
                                                if (aVal < bVal) return -1 * dir;
                                                if (aVal > bVal) return 1 * dir;
                                                return 0;
                                            })
                                            .map((user: any) => (
                                                <tr key={user.username} className="border-b border-grey-lightest hover:bg-grey-lighter">
                                                    <td className="p-3 text-grey-darkest">{user.username}</td>
                                                    <td className="p-3 text-grey-darkest whitespace-nowrap">{user.first_name} {user.last_name}</td>
                                                    <td className="p-3 text-grey-darkest text-center font-medium">{user.Total || 0}</td>
                                                    {engagementCategories.map((cat) => (
                                                        <td key={cat} className="p-3 text-grey-darkest text-center">{user[cat] || 0}</td>
                                                    ))}
                                                    <td className="p-3 text-grey-darkest whitespace-nowrap">{formatDate(user.last_modified)}</td>
                                                </tr>
                                            ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Alert Modal */}
            {alertModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[500]">
                    <div className="bg-white rounded-lg p-6 w-full max-w-lg mx-4">
                        <div className="text-sm text-grey-darkest">{alertModal}</div>
                        <div className="mt-6 text-right">
                            <button
                                onClick={() => {
                                    const msg = alertModal;
                                    setAlertModal(null);
                                    if (msg === 'Settings saved successfully.') {
                                        navigate('/home');
                                    }
                                }}
                                className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-150"
                            >
                                OK
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default Instructor;
