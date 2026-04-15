import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/Auth';
import { getInstructorWorkspace, createInstructorNote } from '../services/api';
import Header from '../components/Header';
import Workspace from '../components/Workspace';
import DataStories from '../components/DataStories';
import CompactSidebar from '../components/CompactSidebar';
import Footer from '../components/Footer';

type StudentInfo = {
    id: string;
    username: string;
    first_name: string;
    last_name: string;
};

const ViewWorkspace = () => {
    const { studentId } = useParams<{ studentId: string }>();
    const navigate = useNavigate();
    const { userAuthenticated, isInstructor } = useAuth();

    const [student, setStudent] = useState<StudentInfo | null>(null);
    const [selectedPattern, setSelectedPattern] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [refreshKey, setRefreshKey] = useState(0);
    const [leftMenuOpen, setLeftMenuOpen] = useState(false);
    const [dataStoriesExpanded, setDataStoriesExpanded] = useState(false);

    // Redirect non-admin users
    useEffect(() => {
        if (!userAuthenticated) {
            navigate('/login');
        } else if (!isInstructor) {
            navigate('/home');
        }
    }, [userAuthenticated, isInstructor, navigate]);

    // Validate admin access and get student info
    useEffect(() => {
        if (!studentId || !isInstructor) return;

        const loadStudentInfo = async () => {
            setLoading(true);
            try {
                const studentInfo = await getInstructorWorkspace(studentId);
                setStudent(studentInfo);
            } catch (err: any) {
                if (err?.response?.status === 404) {
                    setError('User not found.');
                } else if (err?.response?.status === 403) {
                    setError('Not authorized to view this workspace.');
                } else {
                    setError('An error occurred while loading the workspace.');
                }
            } finally {
                setLoading(false);
            }
        };

        loadStudentInfo();
    }, [studentId, isInstructor]);

    const studentName = student
        ? `${student.first_name || ''} ${student.last_name || ''}`.trim() || student.username
        : '';

    const handleGiveFeedback = async () => {
        if (!studentId) return;
        try {
            await createInstructorNote(studentId);
            // Trigger workspace refresh by changing key
            setRefreshKey(prev => prev + 1);
        } catch (err) {
            console.error('Error creating instructor feedback:', err);
        }
    };

    if (error) {
        return (
            <>
                <Header floating subtitle="View Workspace" />
                <div className="min-h-screen bg-grey-lighter pt-20 px-8 flex items-center justify-center">
                    <div className="bg-white rounded-lg p-6 shadow-sm text-center">
                        <p className="text-sm text-grey-darkest">{error}</p>
                        <button
                            onClick={() => navigate('/instructor')}
                            className="mt-4 bg-bama-crimson text-sm text-white rounded-full px-4 py-1.5 hover:brightness-95 transition duration-200"
                        >
                            Back to Instructor
                        </button>
                    </div>
                </div>
            </>
        );
    }

    if (loading || !student) {
        return (
            <>
                <Header floating subtitle="View Workspace" />
                <div className="min-h-screen bg-grey-lighter pt-20 px-8 flex items-center justify-center">
                    <div className="text-center">
                        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-dark"></div>
                        <p className="mt-4 text-grey-dark">Loading workspace...</p>
                    </div>
                </div>
            </>
        );
    }

    return (
        <>
            <Header
                onMenuOpen={() => setLeftMenuOpen(prev => !prev)}
                floating
                menuOpen={leftMenuOpen}
                subtitle="Instructor"
                extraContent={
                    <>
                        <span className="bg-bama-crimson text-white text-sm rounded-full px-3 py-1 whitespace-nowrap shadow-lg">
                            Viewing: {studentName}'s Workspace
                        </span>
                        <button
                            onClick={handleGiveFeedback}
                            className="bg-red-400 text-sm text-white rounded-full px-3 py-1 shadow-lg hover:-translate-y-[.05rem] hover:shadow-lg hover:brightness-95 transition duration-200 whitespace-nowrap"
                        >
                            Give Feedback
                        </button>
                    </>
                }
            />

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

            <div className="h-screen">
                <Workspace
                    key={refreshKey}
                    setRightNarrativePatternsOpen={() => {}}
                    setSelectedPattern={setSelectedPattern}
                    selectedPattern={selectedPattern}
                    storyLoading={false}
                    setStoryLoading={() => {}}
                    readOnly={true}
                    targetUser={studentId}
                />
            </div>

            {/* DataStories — bottom-anchored overlay (same as Home.tsx) */}
            <div className={`fixed bottom-0 left-1/2 -translate-x-1/2 w-1/2 z-[300] flex flex-col bg-bama-crimson rounded-t-xl shadow-2xl transition-all duration-300 ${
                dataStoriesExpanded ? 'max-h-[75vh]' : 'max-h-[32px]'
            }`}>
                <button
                    className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs text-white hover:brightness-110 rounded-t-xl transition-colors duration-150 flex-shrink-0"
                    onClick={() => setDataStoriesExpanded(!dataStoriesExpanded)}
                >
                    <svg
                        className={`w-3 h-3 transition-transform duration-300 ${dataStoriesExpanded ? 'rotate-180' : ''}`}
                        fill="none" stroke="currentColor" viewBox="0 0 24 24"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    </svg>
                    {dataStoriesExpanded ? 'Collapse' : 'Expand'} Story
                </button>
                <div className={`flex-1 min-h-0 overflow-y-auto px-1 pb-1 ${dataStoriesExpanded ? '' : 'hidden'}`}>
                    <div className="bg-grey-lighter-2 rounded-lg px-4 pb-4">
                        <DataStories targetUser={studentId} readOnly={true} />
                    </div>
                </div>
            </div>
        </>
    );
};

export default ViewWorkspace;
