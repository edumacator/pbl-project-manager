import React, { useState, useEffect } from 'react';
import { Task, Project, TaskReflection, ProjectResource } from '../types';
import { X, CheckCircle2, Clock, AlertCircle, Plus, ExternalLink, Link as LinkIcon, FileText, Pencil } from 'lucide-react';
import { api } from '../api/client';
import { useToast } from '../contexts/ToastContext';

interface TaskDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    task: Task | null;
    project: Project;
    onEditTask?: (task: Task) => void;
    onTaskClaim?: (taskId: number) => void;
}

type TabType = 'overview' | 'reflections' | 'resources';

export const TaskDetailsModal: React.FC<TaskDetailsModalProps> = ({ isOpen, onClose, task, project, onEditTask, onTaskClaim }) => {
    const [activeTab, setActiveTab] = useState<TabType>('overview');
    const [reflections, setReflections] = useState<TaskReflection[]>([]);
    const [resources, setResources] = useState<ProjectResource[]>([]);
    const [newReflection, setNewReflection] = useState('');
    const [newResourceTitle, setNewResourceTitle] = useState('');
    const [newResourceUrl, setNewResourceUrl] = useState('');
    const [uploadMode, setUploadMode] = useState(false);
    const [loading, setLoading] = useState(false);
    const { addToast } = useToast();



    const isTeacher = !window.location.pathname.includes('/student');
    const isOwner = task?.assignee_id === 2; // Hardcoded student 2 to match prototype auth
    const canEdit = isTeacher || isOwner;

    const fetchData = async () => {
        if (!task) return;
        setLoading(true);
        try {
            const [refRes, resRes] = await Promise.all([
                api.get<TaskReflection[]>(`/tasks/${task.id}/reflections`).catch(() => []),
                api.get<ProjectResource[]>(`/tasks/${task.id}/resources`).catch(() => [])
            ]);
            setReflections(refRes || []);
            setResources(resRes || []);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen && task) {
            fetchData();
            setActiveTab('overview');
        }
    }, [isOpen, task?.id]);



    const handleAddReflection = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newReflection.trim() || !task) return;
        try {
            await api.post(`/tasks/${task.id}/reflections`, { content: newReflection });
            setNewReflection('');
            fetchData();
        } catch (err) {
            console.error(err);
        }
    };

    const handleAddResource = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newResourceTitle.trim() || !newResourceUrl.trim() || !task) return;
        try {
            await api.post(`/projects/${project.id}/resources`, {
                task_id: task.id,
                title: newResourceTitle,
                url: newResourceUrl,
                type: 'link'
            });
            setNewResourceTitle('');
            setNewResourceUrl('');
            fetchData();
        } catch (err) {
            console.error(err);
        }
    };

    if (!isOpen || !task) return null;

    const StatusIcon = task.status === 'done' ? CheckCircle2 : (task.status === 'in_progress' ? Clock : AlertCircle);
    const statusColor = task.status === 'done' ? 'text-green-500' : (task.status === 'in_progress' ? 'text-blue-500' : 'text-gray-400');

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
                {/* Header */}
                <div className="flex justify-between items-start p-6 border-b border-gray-100 bg-gray-50/50">
                    <div className="flex gap-4 items-start">
                        <div className={`p-2 rounded-lg bg-white shadow-sm border border-gray-100 ${statusColor}`}>
                            <StatusIcon className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900 leading-tight mb-1">{task.title}</h2>
                            <div className="flex items-center gap-3 text-sm text-gray-500">
                                <span className="capitalize font-medium text-gray-700">{task.status.replace('_', ' ')}</span>
                                {task.assignee_id ? (
                                    <span>Assignee: {task.assignee_name || `User ${task.assignee_id}`}</span>
                                ) : (
                                    onTaskClaim && (
                                        <button
                                            onClick={() => onTaskClaim(task.id)}
                                            className="text-xs font-bold uppercase tracking-wider bg-indigo-50 text-indigo-600 hover:bg-indigo-100 px-2 py-1 rounded transition-colors"
                                        >
                                            Claim Task
                                        </button>
                                    )
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {canEdit && (
                            <button
                                onClick={() => onEditTask?.(task)}
                                className="px-3 py-1.5 text-sm font-medium text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors flex items-center"
                            >
                                <Pencil className="w-4 h-4 mr-1" /> Edit
                            </button>
                        )}
                        <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors ml-2 border-l border-gray-200">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Tabs Navigation */}
                <div className="flex border-b border-gray-200 px-6 pt-2">
                    <button
                        onClick={() => setActiveTab('overview')}
                        className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'overview' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                    >
                        Overview
                    </button>
                    {(project.requires_reflection || project.requires_milestone_reflection) && (
                        <button
                            onClick={() => setActiveTab('reflections')}
                            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'reflections' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                        >
                            Reflections
                        </button>
                    )}
                    <button
                        onClick={() => setActiveTab('resources')}
                        className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'resources' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                    >
                        Resources
                    </button>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
                    {activeTab === 'overview' && (
                        <div className="space-y-6">
                            <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                                <h3 className="text-sm font-semibold text-gray-900 mb-2 uppercase tracking-wider">Description</h3>
                                <p className="text-gray-600 whitespace-pre-wrap text-sm leading-relaxed">{task.description || "No description provided."}</p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-white p-4 justify-between flex items-center rounded-xl border border-gray-100 shadow-sm">
                                    <span className="text-sm text-gray-500">Start Date</span>
                                    <span className="font-medium text-gray-900">{task.start_date ? task.start_date.substring(0, 10) : '-'}</span>
                                </div>
                                <div className="bg-white p-4 justify-between flex items-center rounded-xl border border-gray-100 shadow-sm">
                                    <span className="text-sm text-gray-500">Due Date</span>
                                    <span className="font-medium text-gray-900">{task.due_date ? task.due_date.substring(0, 10) : '-'}</span>
                                </div>
                                <div className="bg-white p-4 justify-between flex rounded-xl border border-gray-100 shadow-sm">
                                    <span className="text-sm text-gray-500">Dependencies</span>
                                    <span className="font-medium text-gray-900">{task.dependencies && task.dependencies.length > 0 ? `${task.dependencies.length} tasks` : 'None'}</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'reflections' && (
                        <div className="space-y-6">
                            <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                                <h3 className="text-sm font-semibold text-gray-900 mb-4 uppercase tracking-wider">Reflection Log</h3>
                                {loading ? (
                                    <div className="text-gray-400 text-sm py-4">Loading reflections...</div>
                                ) : reflections.length === 0 ? (
                                    <div className="text-gray-400 text-sm py-4 italic">No reflections recorded yet.</div>
                                ) : (
                                    <div className="space-y-4">
                                        {reflections.map(ref => (
                                            <div key={ref.id} className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                                                <div className="flex justify-between items-center mb-2">
                                                    <span className="font-medium text-sm text-gray-700">Student Log</span>
                                                    <span className="text-xs text-gray-400">{ref.created_at ? new Date(ref.created_at).toLocaleString() : ''}</span>
                                                </div>
                                                <p className="text-gray-600 text-sm whitespace-pre-wrap">{ref.content}</p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <form onSubmit={handleAddReflection} className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                                <h4 className="text-sm font-medium text-gray-900 mb-3">Add New Entry</h4>
                                <textarea
                                    value={newReflection}
                                    onChange={(e) => setNewReflection(e.target.value)}
                                    placeholder="What did you accomplish? What challenges did you face?"
                                    className="w-full text-sm p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 min-h-[100px] resize-y mb-3"
                                    required
                                />
                                <div className="flex justify-end">
                                    <button
                                        type="submit"
                                        disabled={!newReflection.trim() || loading}
                                        className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors flex items-center"
                                    >
                                        <Plus className="w-4 h-4 mr-1" /> Add Entry
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    {activeTab === 'resources' && (
                        <div className="space-y-6">
                            <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                                <h3 className="text-sm font-semibold text-gray-900 mb-4 uppercase tracking-wider">Attached Resources</h3>
                                {loading ? (
                                    <div className="text-gray-400 text-sm py-4">Loading resources...</div>
                                ) : resources.length === 0 ? (
                                    <div className="text-gray-400 text-sm py-4 italic">No resources attached yet.</div>
                                ) : (
                                    <div className="space-y-3">
                                        {resources.map(res => (
                                            <div key={res.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border border-gray-100 hover:border-indigo-100 hover:bg-indigo-50/30 transition-colors">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 bg-indigo-100 text-indigo-600 rounded">
                                                        {res.type === 'file' ? <FileText className="w-4 h-4" /> : <LinkIcon className="w-4 h-4" />}
                                                    </div>
                                                    <div>
                                                        <a href={res.url} target="_blank" rel="noopener noreferrer" className="font-medium text-sm text-gray-900 hover:text-indigo-600">
                                                            {res.title}
                                                        </a>
                                                        <div className="text-xs text-gray-400">{res.type.toUpperCase()} • Added {res.created_at ? new Date(res.created_at).toLocaleDateString() : 'recently'}</div>
                                                    </div>
                                                </div>
                                                <a href={res.url} target="_blank" rel="noopener noreferrer" className="p-2 text-gray-400 hover:text-indigo-600 bg-white rounded shadow-sm border border-gray-100">
                                                    <ExternalLink className="w-4 h-4" />
                                                </a>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <form onSubmit={handleAddResource} className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm mt-4">
                                <h4 className="text-sm font-medium text-gray-900 mb-4">Attach Resource</h4>

                                <div className="space-y-4">
                                    <div className="relative flex items-center bg-gray-50 border border-gray-200 rounded-lg overflow-hidden transition-colors focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500">
                                        {!uploadMode ? (
                                            <input
                                                type="text"
                                                value={newResourceUrl}
                                                onChange={(e) => setNewResourceUrl(e.target.value)}
                                                placeholder="Paste a long URL..."
                                                className="flex-1 text-sm p-3 bg-transparent border-0 focus:ring-0 focus:outline-none"
                                            />
                                        ) : (
                                            <div className="flex-1 text-sm p-3 text-gray-400 bg-transparent flex items-center gap-2 cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => addToast("File selection dialog would open here", 'info')}>
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                                                </svg>
                                                Select a file from your computer...
                                            </div>
                                        )}
                                        <div className="flex items-center px-2">
                                            <button
                                                type="button"
                                                onClick={() => setUploadMode(!uploadMode)}
                                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-600 bg-white border border-gray-200 rounded hover:bg-gray-50 hover:text-indigo-600 transition-colors shadow-sm"
                                            >
                                                {!uploadMode ? (
                                                    <>
                                                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                                                        Upload
                                                    </>
                                                ) : (
                                                    <>
                                                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
                                                        Link
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </div>

                                    {(newResourceUrl.length > 0 || uploadMode) && (
                                        <div className="space-y-1 animate-in slide-in-from-top-2 duration-200">
                                            <label className="block text-xs font-medium text-gray-500 ml-1">Title (Optional)</label>
                                            <input
                                                type="text"
                                                value={newResourceTitle}
                                                onChange={(e) => setNewResourceTitle(e.target.value)}
                                                placeholder="e.g. Reference Document"
                                                className="w-full text-sm p-3 border border-gray-200 rounded-lg focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                                            />
                                        </div>
                                    )}

                                    <div className="pt-2">
                                        <button
                                            type="submit"
                                            disabled={(!uploadMode && !newResourceUrl.trim()) || loading}
                                            className="w-full bg-slate-900 text-white px-4 py-3 rounded-xl text-sm font-bold hover:bg-slate-800 disabled:opacity-50 transition-colors shadow-sm"
                                        >
                                            Attach Resource
                                        </button>
                                    </div>
                                </div>
                            </form>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
