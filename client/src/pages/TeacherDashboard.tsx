import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { Class, Project } from '../types';
import { Plus, BookOpen, Layout, Calendar, Archive } from 'lucide-react';
import { Link } from 'react-router-dom';
import StudentActivityPane from '../components/StudentActivityPane';
import StuckTeamsPane from '../components/StuckTeamsPane';
import { ClassMilestonesModal } from '../components/ClassMilestonesModal';
import { useToast } from '../contexts/ToastContext';

const TeacherDashboard: React.FC = () => {
    const [classes, setClasses] = useState<Class[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreateClassModal, setShowCreateClassModal] = useState(false);
    const [newClassName, setNewClassName] = useState('');
    const [selectedClassForMilestones, setSelectedClassForMilestones] = useState<Class | null>(null);
    const [showArchived, setShowArchived] = useState(false);
    const { addToast } = useToast();

    const fetchData = () => {
        setLoading(true);
        const query = showArchived ? '?include_deleted=true' : '';
        Promise.all([
            api.get<Class[]>(`/classes${query}`),
            api.get<Project[]>(`/projects${query}`)
        ])
            .then(([classData, projectData]) => {
                setClasses(classData || []);
                setProjects(projectData || []);
            })
            .catch(err => console.error(err))
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        document.title = "Teacher Dashboard | PBL Manager";
        fetchData();
    }, [showArchived]);

    const handleCreateClass = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.post('/classes', { name: newClassName });
            setShowCreateClassModal(false);
            setNewClassName('');
            fetchData();
            addToast('Class created successfully', 'success');
        } catch (error) {
            console.error('Failed to create class:', error);
            addToast('Failed to create class', 'error');
        }
    };

    const handleDeleteClass = async (id: number) => {
        if (!confirm('Are you sure you want to archive this class?')) return;
        try {
            await api.delete(`/classes/${id}`);
            fetchData();
            addToast('Class archived', 'success');
        } catch (error) {
            console.error('Failed to archive class:', error);
            addToast('Failed to archive class', 'error');
        }
    };

    const handleRestoreClass = async (id: number) => {
        try {
            await api.post(`/classes/${id}/restore`, {});
            fetchData();
            addToast('Class restored', 'success');
        } catch (error) {
            console.error('Failed to restore class:', error);
            addToast('Failed to restore class', 'error');
        }
    };

    const handleDeleteProject = async (id: number) => {
        if (!confirm('Are you sure you want to archive this project?')) return;
        try {
            await api.delete(`/projects/${id}`);
            fetchData();
            window.dispatchEvent(new CustomEvent('projects-changed'));
            addToast('Project archived', 'success');
        } catch (error) {
            console.error('Failed to archive project:', error);
            addToast('Failed to archive project', 'error');
        }
    };

    const handleRestoreProject = async (id: number) => {
        try {
            await api.post(`/projects/${id}/restore`, {});
            fetchData();
            window.dispatchEvent(new CustomEvent('projects-changed'));
            addToast('Project restored', 'success');
        } catch (error) {
            console.error('Failed to restore project:', error);
            addToast('Failed to restore project', 'error');
        }
    };

    return (
        <div className="h-[calc(100vh-80px)] overflow-hidden flex flex-col">
            <div className="flex justify-between items-center mb-6 px-4 pt-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Teacher Dashboard</h1>
                    <p className="text-gray-500">Overview of your classes and projects.</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setShowArchived(!showArchived)}
                        className={`p-2 rounded-lg transition-colors flex items-center gap-2 border ${showArchived ? 'bg-amber-100 text-amber-700 border-amber-200' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
                        title={showArchived ? "Hide Archived" : "Show Archived"}
                    >
                        <Archive className="w-4 h-4" />
                        <span className="text-sm font-medium hidden sm:inline">{showArchived ? 'Hide Archived' : 'Show Archived'}</span>
                    </button>
                </div>
            </div>

            {/* <AnalyticsSummary />  Moving analytics to a dedicated stats view or keeping it slim at top if needed, skipping for layout space */}

            <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-6 p-4 overflow-hidden min-h-0">
                {/* Pane 1: Classes */}
                <div className="flex flex-col bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                        <h2 className="font-semibold text-gray-800 flex items-center">
                            <BookOpen className="w-4 h-4 mr-2" /> Classes
                        </h2>
                        <button onClick={() => setShowCreateClassModal(true)} className="text-indigo-600 hover:text-indigo-800 text-sm font-medium">
                            + New Class
                        </button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {loading ? <div>Loading...</div> : classes.map(cls => (
                            <div key={cls.id} className="group bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-all">
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className="font-medium text-gray-900">{cls.name}</h3>
                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex space-x-2">
                                        <button
                                            onClick={() => setSelectedClassForMilestones(cls)}
                                            className="text-gray-400 hover:text-indigo-500"
                                            title="Manage Milestones"
                                        >
                                            <Calendar className="w-4 h-4" />
                                        </button>
                                        {cls.deleted_at ? (
                                            <button onClick={() => handleRestoreClass(cls.id)} className="text-gray-400 hover:text-green-500" title="Restore Class">
                                                <Plus className="w-4 h-4" />
                                            </button>
                                        ) : (
                                            <button onClick={() => handleDeleteClass(cls.id)} className="text-gray-400 hover:text-red-500" title="Archive Class">
                                                <Archive className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                                <div className="mt-4">
                                    <Link to={`/classes/${cls.id}`} className="block w-full text-center py-1.5 bg-indigo-50 text-indigo-700 rounded-md text-sm font-medium hover:bg-indigo-100">
                                        Open Class
                                    </Link>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Pane 2: Projects */}
                <div className="flex flex-col bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                        <h2 className="font-semibold text-gray-800 flex items-center">
                            <Layout className="w-4 h-4 mr-2" /> Projects
                        </h2>
                        <Link to="/projects/new" className="text-indigo-600 hover:text-indigo-800 text-sm font-medium">
                            + New Project
                        </Link>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {loading ? <div>Loading...</div> : projects.map(proj => (
                            <div key={proj.id} className="group bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-all">
                                <h3 className="font-medium text-gray-900 mb-1">{proj.title}</h3>
                                <p className="text-xs text-gray-500 line-clamp-2 mb-3">{proj.driving_question}</p>

                                <div className="space-y-2 mb-3">
                                    <div className="flex flex-wrap gap-1">
                                        {proj.classes && proj.classes.length > 0 ? (
                                            proj.classes.map(c => (
                                                <span key={c.id} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                                    {c.name}
                                                </span>
                                            ))
                                        ) : (
                                            <span className="text-xs text-gray-400 italic">No classes assigned</span>
                                        )}
                                    </div>
                                    {proj.due_date && (
                                        <div className="text-xs text-gray-600">
                                            Due: <span className="font-medium">{new Date(proj.due_date).toLocaleDateString()}</span>
                                        </div>
                                    )}
                                </div>

                                <div className="flex space-x-2 mt-3">
                                    <Link to={`/projects/${proj.id}`} className="flex-1 text-center py-1.5 border border-indigo-200 text-indigo-700 rounded-md text-sm font-medium hover:bg-indigo-50">
                                        Edit / View
                                    </Link>
                                    {proj.deleted_at ? (
                                        <button onClick={() => handleRestoreProject(proj.id)} className="px-3 border border-gray-200 text-gray-400 hover:text-green-500 rounded-md flex items-center justify-center transition-colors" title="Restore Project">
                                            <Plus className="w-4 h-4" />
                                        </button>
                                    ) : (
                                        <button onClick={() => handleDeleteProject(proj.id)} className="px-3 border border-gray-200 text-gray-400 hover:text-red-500 rounded-md flex items-center justify-center transition-colors" title="Archive Project">
                                            <Archive className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Pane 3: Student Activity */}
                <div className="flex flex-col h-full overflow-hidden">
                    <StudentActivityPane />
                </div>

                {/* Pane 4: Stuck Teams */}
                <div className="flex flex-col h-full overflow-hidden">
                    <StuckTeamsPane />
                </div>
            </div>

            {showCreateClassModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
                        <h2 className="text-xl font-bold mb-4">Create New Class</h2>
                        <form onSubmit={handleCreateClass}>
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Class Name</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                    placeholder="e.g. Period 1 - Physics"
                                    value={newClassName}
                                    onChange={e => setNewClassName(e.target.value)}
                                />
                            </div>
                            <div className="flex justify-end space-x-3">
                                <button
                                    type="button"
                                    onClick={() => setShowCreateClassModal(false)}
                                    className="px-4 py-2 text-gray-600 hover:text-gray-800"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                                >
                                    Create Class
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {selectedClassForMilestones && (
                <ClassMilestonesModal
                    classId={selectedClassForMilestones.id}
                    className={selectedClassForMilestones.name}
                    isOpen={!!selectedClassForMilestones}
                    onClose={() => setSelectedClassForMilestones(null)}
                />
            )}
        </div>
    );
};

export default TeacherDashboard;
