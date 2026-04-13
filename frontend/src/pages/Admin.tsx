import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/Auth';
import { getFeatureFlags, updateFeatureFlags, getAdminUsers } from '../services/api';
import Header from '../components/Header';
import CompactSidebar from '../components/CompactSidebar';
import Footer from '../components/Footer';

type UserRow = {
    id: string;
    username: string;
    email: string;
    first_name: string;
    last_name: string;
    is_admin: boolean;
};

const Admin = () => {
    const navigate = useNavigate();
    const { userAuthenticated, isAdmin } = useAuth();

    const [leftMenuOpen, setLeftMenuOpen] = useState(false);
    const [annotateWithAI, setAnnotateWithAI] = useState(true);
    const [selectWithAI, setSelectWithAI] = useState(true);
    const [users, setUsers] = useState<UserRow[]>([]);
    const [alertModal, setAlertModal] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    // Redirect non-admin users
    useEffect(() => {
        if (!userAuthenticated) {
            navigate('/login');
        } else if (!isAdmin) {
            navigate('/home');
        }
    }, [userAuthenticated, isAdmin, navigate]);

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
                const data = await getAdminUsers();
                setUsers(data.users || []);
            } catch (err) {
                console.error('Error loading users:', err);
            }
        };

        if (isAdmin) load();
    }, [isAdmin]);

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

    if (!isAdmin) return null;

    return (
        <>
            <Header onMenuOpen={() => setLeftMenuOpen(prev => !prev)} floating menuOpen={leftMenuOpen} subtitle="Admin" />

            {/* Left Panel */}
            {leftMenuOpen && (
                <>
                    <div className="fixed inset-0 bg-black bg-opacity-30 z-[400]" onClick={() => setLeftMenuOpen(false)} />
                    <div className="fixed top-0 left-0 bottom-0 w-1/5 min-w-[256px] bg-grey-lighter-2 shadow-xl z-[401] overflow-y-auto">
                        <div className="flex justify-end p-2">
                            <button className="w-7 h-7 bg-grey-lighter hover:bg-grey-light rounded-full flex items-center justify-center text-grey-darker hover:text-grey-darkest transition-colors duration-200" onClick={() => setLeftMenuOpen(false)}>×</button>
                        </div>
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

                    {/* Users Section */}
                    <h2 className="text-lg font-semibold text-grey-darkest mt-8 mb-4">User accounts:</h2>
                    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-grey-lighter border-b border-grey-lightest">
                                    <th className="text-left p-3 font-medium text-grey-darkest">Username</th>
                                    <th className="text-left p-3 font-medium text-grey-darkest">Email</th>
                                    <th className="text-left p-3 font-medium text-grey-darkest">Name</th>
                                    <th className="text-left p-3 font-medium text-grey-darkest">Role</th>
                                    <th className="text-left p-3 font-medium text-grey-darkest">Give Feedback</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map((user) => (
                                    <tr key={user.id} className="border-b border-grey-lightest hover:bg-grey-lighter">
                                        <td className="p-3 text-grey-darkest">{user.username}</td>
                                        <td className="p-3 text-grey-darkest">{user.email}</td>
                                        <td className="p-3 text-grey-darkest">{user.first_name} {user.last_name}</td>
                                        <td className="p-3">
                                            <span className={`text-xs px-2 py-0.5 rounded-full ${user.is_admin ? 'bg-bama-crimson text-white' : 'bg-grey-lighter text-grey-darkest'}`}>
                                                {user.is_admin ? 'Admin' : 'User'}
                                            </span>
                                        </td>
                                        <td className="p-3">
                                            {!user.is_admin && (
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
                                        <td colSpan={5} className="p-3 text-center text-grey-dark">No users found.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
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

export default Admin;
