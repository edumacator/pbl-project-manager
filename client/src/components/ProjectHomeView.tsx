import React, { useState, useEffect } from 'react';
import { Project, ProjectResource, User } from '../types';
import { api } from '../api/client';
import { useToast } from '../contexts/ToastContext';
import { Plus, MessageCircle, Save, Edit2, Trash2, FileText, Link2, Maximize2, Minimize2 } from 'lucide-react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';

interface ProjectQna {
    id: number;
    project_id: number;
    author_id: number;
    question: string;
    answer?: string;
    answered_by?: number;
    author_name?: string;
    answered_by_name?: string;
    created_at?: string;
    updated_at?: string;
}

interface ProjectHomeViewProps {
    project: Project;
    currentUser: User | null;
    teams: any[];
    tasks: any[];
    onTeamSelect: (teamId: number) => void;
    onProjectUpdate: (updatedProject: Project) => void;
}

export const ProjectHomeView: React.FC<ProjectHomeViewProps> = ({ project, currentUser, teams, tasks, onTeamSelect, onProjectUpdate }) => {
    const { addToast } = useToast();

    // Resources state
    const [resources, setResources] = useState<ProjectResource[]>([]);
    const [loadingResources, setLoadingResources] = useState(false);
    const [newResourceTitle, setNewResourceTitle] = useState('');
    const [newResourceUrl, setNewResourceUrl] = useState('');
    const [newResourceType, setNewResourceType] = useState<'link' | 'file'>('link');
    const [newResourceDescription, setNewResourceDescription] = useState('');
    const [showResourceModal, setShowResourceModal] = useState(false);
    const [editingResource, setEditingResource] = useState<ProjectResource | null>(null);
    const [expandedPanel, setExpandedPanel] = useState<'resources' | 'qna' | null>(null);

    // Q&A state
    const [questions, setQuestions] = useState<ProjectQna[]>([]);
    const [loadingQna, setLoadingQna] = useState(false);
    const [newQuestion, setNewQuestion] = useState('');
    const [answeringId, setAnsweringId] = useState<number | null>(null);
    const [answerText, setAnswerText] = useState('');

    // Editor state
    const [isSavingDesc, setIsSavingDesc] = useState(false);
    const [isEditingMode, setIsEditingMode] = useState(false);
    const isTeacher = currentUser?.role === 'teacher';

    const editor = useEditor({
        extensions: [StarterKit],
        content: project.description || '',
        editable: isTeacher,
        editorProps: {
            attributes: {
                class: 'prose prose-sm sm:prose-base max-w-none focus:outline-none min-h-[100px]',
            },
        },
    });


    useEffect(() => {
        fetchResources();
        fetchQna();
    }, [project.id]);

    useEffect(() => {
        if (editor && project.description && project.description !== editor.getHTML()) {
            // Only update editor content if it's vastly different to avoid jumping cursor on re-renders,
            // but since we only update project descripton on save, this is fine.
            editor.commands.setContent(project.description);
        }
    }, [project.description, editor]);

    const fetchResources = async () => {
        setLoadingResources(true);
        try {
            const data = await api.get<ProjectResource[]>(`/projects/${project.id}/resources`);
            setResources((data || []).filter(r => !r.team_id));
        } catch (e) {
            console.error(e);
        } finally {
            setLoadingResources(false);
        }
    };

    const fetchQna = async () => {
        setLoadingQna(true);
        try {
            const data = await api.get<ProjectQna[]>(`/projects/${project.id}/qna`);
            setQuestions(data || []);
        } catch (e) {
            console.error(e);
        } finally {
            setLoadingQna(false);
        }
    };

    const handleSaveDescription = async () => {
        if (!editor) return;
        setIsSavingDesc(true);
        try {
            const newDesc = editor.getHTML();
            const res = await api.put<{ project: Project }>(`/projects/${project.id}`, {
                description: newDesc
            });
            if (res && res.project) {
                onProjectUpdate(res.project);
                addToast('Project description updated', 'success');
            }
        } catch (e) {
            addToast('Failed to update description', 'error');
        } finally {
            setIsSavingDesc(false);
        }
    };

    const handleEditResourceClick = (res: ProjectResource) => {
        setEditingResource(res);
        setNewResourceTitle(res.title);
        setNewResourceUrl(res.url);
        setNewResourceType(res.type as 'link' | 'file');
        setNewResourceDescription(res.description || '');
        setShowResourceModal(true);
    };

    const handleDeleteResource = async (id: number) => {
        if (!confirm('Are you sure you want to delete this resource?')) return;
        try {
            await api.delete(`/resources/${id}`);
            addToast('Resource deleted', 'success');
            setShowResourceModal(false);
            fetchResources();
        } catch (e) {
            addToast('Failed to delete resource', 'error');
        }
    };

    const handleSaveResource = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingResource) {
                await api.put(`/resources/${editingResource.id}`, {
                    title: newResourceTitle,
                    url: newResourceUrl,
                    type: newResourceType,
                    description: newResourceDescription || null
                });
                addToast('Resource updated', 'success');
            } else {
                await api.post(`/projects/${project.id}/resources`, {
                    title: newResourceTitle,
                    url: newResourceUrl,
                    type: newResourceType,
                    description: newResourceDescription || null
                });
                addToast('Resource added', 'success');
            }

            setNewResourceTitle('');
            setNewResourceUrl('');
            setNewResourceDescription('');
            setEditingResource(null);
            setShowResourceModal(false);
            fetchResources();
        } catch (e) {
            addToast('Failed to save resource', 'error');
        }
    };

    const handleAskQuestion = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newQuestion.trim()) return;
        try {
            await api.post(`/projects/${project.id}/qna`, {
                question: newQuestion
            });
            addToast('Question submitted', 'success');
            setNewQuestion('');
            fetchQna();
        } catch (e) {
            addToast('Failed to submit question', 'error');
        }
    };

    const submitAnswer = async (qnaId: number) => {
        if (!answerText.trim()) return;
        try {
            await api.put(`/projects/${project.id}/qna/${qnaId}`, {
                answer: answerText
            });
            addToast('Answer submitted', 'success');
            setAnsweringId(null);
            setAnswerText('');
            fetchQna();
        } catch (e) {
            addToast('Failed to submit answer', 'error');
        }
    };

    // Group teams by class from the assigned classes
    // User requested to see "all classes it's assigned to" in quick navigation.
    const projectClasses = project.classes || [];

    // Create a map of class names to their teams
    const teamsByClass = projectClasses.reduce((acc, cls) => {
        acc[cls.name] = teams.filter(t => t.class_id === cls.id || t.class_name === cls.name);
        return acc;
    }, {} as Record<string, any[]>);

    // Also catch teams that might not match a class assigned to the project directly somehow
    teams.forEach(team => {
        const className = team.class_name || 'No Class';
        if (!teamsByClass[className]) {
            teamsByClass[className] = [];
        }
        if (!teamsByClass[className].find(t => t.id === team.id)) {
            teamsByClass[className].push(team);
        }
    });

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6">
            {/* Fullscreen Backdrop */}
            {expandedPanel && (
                <div
                    className="fixed inset-0 bg-gray-900/20 backdrop-blur-sm z-40 transition-opacity"
                    onClick={() => setExpandedPanel(null)}
                />
            )}

            {/* LEFT COLUMN: Description & Teams */}
            <div className="lg:col-span-2 space-y-6">

                {/* Editable Description Card */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
                    <div className="p-5 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                        <h3 className="font-semibold text-gray-900 text-lg">Project Description</h3>
                        {isTeacher && (
                            <div className="flex items-center gap-2">
                                {!isEditingMode ? (
                                    <button
                                        onClick={() => setIsEditingMode(true)}
                                        className="text-sm font-medium text-indigo-600 hover:text-indigo-800 transition-colors"
                                    >
                                        Edit
                                    </button>
                                ) : (
                                    <>
                                        <button
                                            onClick={() => {
                                                setIsEditingMode(false);
                                                if (editor && project.description) {
                                                    editor.commands.setContent(project.description);
                                                }
                                            }}
                                            className="text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={async () => {
                                                await handleSaveDescription();
                                                setIsEditingMode(false);
                                            }}
                                            disabled={isSavingDesc}
                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                                        >
                                            <Save className="w-4 h-4" /> {isSavingDesc ? 'Saving...' : 'Save'}
                                        </button>
                                    </>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="p-6 flex-1 text-gray-800">
                        {isEditingMode ? (
                            <>
                                <div className="flex flex-wrap gap-1 bg-gray-50 p-1.5 border border-gray-200 rounded-lg mb-4">
                                    <button type="button" onClick={() => editor?.chain().focus().toggleBold().run()} className={`px-2 py-1 rounded text-sm font-bold ${editor?.isActive('bold') ? 'bg-indigo-100 text-indigo-700' : 'hover:bg-gray-200 text-gray-700'}`}>B</button>
                                    <button type="button" onClick={() => editor?.chain().focus().toggleItalic().run()} className={`px-2 py-1 rounded text-sm italic ${editor?.isActive('italic') ? 'bg-indigo-100 text-indigo-700' : 'hover:bg-gray-200 text-gray-700'}`}>I</button>
                                    <div className="w-px h-6 bg-gray-300 mx-1 self-center"></div>
                                    <button type="button" onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()} className={`px-2 py-1 rounded text-sm font-semibold ${editor?.isActive('heading', { level: 2 }) ? 'bg-indigo-100 text-indigo-700' : 'hover:bg-gray-200 text-gray-700'}`}>H2</button>
                                    <button type="button" onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()} className={`px-2 py-1 rounded text-sm font-semibold ${editor?.isActive('heading', { level: 3 }) ? 'bg-indigo-100 text-indigo-700' : 'hover:bg-gray-200 text-gray-700'}`}>H3</button>
                                    <div className="w-px h-6 bg-gray-300 mx-1 self-center"></div>
                                    <button type="button" onClick={() => editor?.chain().focus().toggleBulletList().run()} className={`px-2 py-1 rounded text-sm ${editor?.isActive('bulletList') ? 'bg-indigo-100 text-indigo-700' : 'hover:bg-gray-200 text-gray-700'}`}>• List</button>
                                    <button type="button" onClick={() => editor?.chain().focus().toggleOrderedList().run()} className={`px-2 py-1 rounded text-sm ${editor?.isActive('orderedList') ? 'bg-indigo-100 text-indigo-700' : 'hover:bg-gray-200 text-gray-700'}`}>1. List</button>
                                </div>
                                <EditorContent editor={editor} className="border border-gray-200 rounded-lg p-2 min-h-[150px] prose prose-sm sm:prose-base max-w-none focus:outline-none" />
                            </>
                        ) : (
                            <div className="prose prose-sm sm:prose-base max-w-none whitespace-pre-wrap">
                                {project.description ? (
                                    <div dangerouslySetInnerHTML={{ __html: project.description }} />
                                ) : (
                                    <p className="text-gray-400 italic">No description provided.</p>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Quick Team Navigation */}
                {(isTeacher || teams.length > 0) && (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                        <h3 className="font-semibold text-gray-900 text-lg mb-4">Quick Navigation: Jump to Team Board</h3>
                        {Object.entries(teamsByClass).map(([className, classTeams]: [string, any]) => (
                            <div key={className} className="mb-6 last:mb-0">
                                <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 px-1">{className}</h4>
                                {classTeams.length === 0 ? (
                                    <p className="text-xs text-gray-400 italic px-1">No teams configured for this class yet.</p>
                                ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                                        {classTeams.map((team: any) => {
                                            const teamTasks = tasks.filter(t => t.team_id === team.id || !t.team_id);
                                            const todoCount = teamTasks.filter(t => t.status === 'todo').length;
                                            const doingCount = teamTasks.filter(t => t.status === 'doing' || t.status === 'in_progress').length;
                                            const doneCount = teamTasks.filter(t => t.status === 'done').length;

                                            return (
                                                <button
                                                    key={team.id}
                                                    onClick={() => onTeamSelect(team.id)}
                                                    className="text-left p-3.5 bg-gray-50 border border-gray-200 rounded-lg hover:border-indigo-400 hover:bg-indigo-50 hover:shadow-sm transition-all group relative overflow-hidden flex flex-col h-full"
                                                >
                                                    <div className="font-semibold text-gray-900 group-hover:text-indigo-700 truncate mb-3">{team.name}</div>

                                                    {/* Task Badges */}
                                                    <div className="flex gap-2 mt-auto">
                                                        <div className="flex items-center gap-1.5" title={`${todoCount} To Do`}>
                                                            <div className="w-2.5 h-2.5 rounded-full bg-gray-300"></div>
                                                            <span className="text-xs font-medium text-gray-600">{todoCount}</span>
                                                        </div>
                                                        <div className="flex items-center gap-1.5" title={`${doingCount} In Progress`}>
                                                            <div className="w-2.5 h-2.5 rounded-full bg-blue-400"></div>
                                                            <span className="text-xs font-medium text-blue-600">{doingCount}</span>
                                                        </div>
                                                        <div className="flex items-center gap-1.5" title={`${doneCount} Done`}>
                                                            <div className="w-2.5 h-2.5 rounded-full bg-green-400"></div>
                                                            <span className="text-xs font-medium text-green-600">{doneCount}</span>
                                                        </div>
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        ))}
                        {teams.length === 0 && (
                            <p className="text-sm text-gray-500 py-4 text-center border border-dashed rounded-lg bg-gray-50">No teams have been created for this project yet.</p>
                        )}
                    </div>
                )}
            </div>

            {/* RIGHT COLUMN: Resources & QnA */}
            <div className="space-y-6">

                {/* Shared Resources Card */}
                <div className={`bg-white rounded-xl border border-gray-200 flex flex-col transition-all ${expandedPanel === 'resources' ? 'fixed inset-4 md:inset-10 z-50 shadow-2xl' : 'shadow-sm max-h-[400px]'}`}>
                    <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                        <h3 className="font-semibold text-gray-900">Shared Resources</h3>
                        <div className="flex items-center gap-3">
                            {isTeacher && (
                                <button
                                    onClick={() => {
                                        setEditingResource(null);
                                        setNewResourceTitle('');
                                        setNewResourceUrl('');
                                        setNewResourceDescription('');
                                        setNewResourceType('link');
                                        setShowResourceModal(true);
                                    }}
                                    className="text-xs font-medium text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                                >
                                    <Plus className="w-3.5 h-3.5" /> Add
                                </button>
                            )}
                            <button
                                onClick={() => setExpandedPanel(expandedPanel === 'resources' ? null : 'resources')}
                                className="text-gray-400 hover:text-gray-600 transition-colors"
                                title={expandedPanel === 'resources' ? "Minimize" : "Expand Fullscreen"}
                            >
                                {expandedPanel === 'resources' ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>

                    <div className="p-4 overflow-y-auto flex-1">
                        {loadingResources ? <p className="text-gray-500 text-center py-4 text-sm">Loading...</p> :
                            resources.length === 0 ? (
                                <p className="text-center py-6 text-sm text-gray-500 bg-gray-50 rounded border border-dashed">No shared resources attached.</p>
                            ) : (
                                <div className="space-y-2">
                                    {resources.map(res => (
                                        <div key={res.id} className="flex flex-col p-3 rounded-lg border border-gray-100 hover:border-indigo-200 hover:bg-indigo-50 transition-colors group relative">
                                            <div className="flex justify-between items-start gap-2">
                                                <a href={res.url} target="_blank" rel="noopener noreferrer" className="flex items-start gap-2 min-w-0 flex-1">
                                                    <div className="shrink-0 mt-0.5">
                                                        {res.type === 'file' ? <FileText className="w-4 h-4 text-emerald-500 group-hover:text-emerald-600" /> : <Link2 className="w-4 h-4 text-blue-500 group-hover:text-blue-600" />}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <h4 className="font-medium text-sm text-gray-900 group-hover:text-indigo-700 truncate">{res.title}</h4>
                                                        {res.description && (
                                                            <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{res.description}</p>
                                                        )}
                                                    </div>
                                                </a>
                                                {isTeacher && (
                                                    <button
                                                        onClick={(e) => { e.preventDefault(); handleEditResourceClick(res); }}
                                                        className="text-gray-400 hover:text-indigo-600 bg-white p-1 rounded border border-gray-100 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                                                        title="Edit Resource"
                                                    >
                                                        <Edit2 className="w-3.5 h-3.5" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )
                        }
                    </div>
                </div>

                {/* Q&A Forum Card */}
                <div className={`bg-white rounded-xl border border-gray-200 flex flex-col transition-all ${expandedPanel === 'qna' ? 'fixed inset-4 md:inset-10 z-50 shadow-2xl' : 'shadow-sm h-[500px]'}`}>
                    <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                            <MessageCircle className="w-4 h-4" /> Q&A Forum
                        </h3>
                        <button
                            onClick={() => setExpandedPanel(expandedPanel === 'qna' ? null : 'qna')}
                            className="text-gray-400 hover:text-gray-600 transition-colors"
                            title={expandedPanel === 'qna' ? "Minimize" : "Expand Fullscreen"}
                        >
                            {expandedPanel === 'qna' ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                        </button>
                    </div>

                    <div className="p-4 overflow-y-auto flex-1 bg-gray-50/50">
                        {loadingQna ? <p className="text-gray-500 text-center py-4 text-sm">Loading...</p> :
                            questions.length === 0 ? (
                                <div className="text-center py-10 bg-white rounded-lg border border-dashed border-gray-200">
                                    <MessageCircle className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                                    <p className="text-sm text-gray-500">No questions asked yet.</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {questions.map(q => (
                                        <div key={q.id} className="bg-white rounded-lg border border-gray-200 shadow-sm text-sm">
                                            <div className="p-3 border-b border-gray-100 bg-gray-50/50">
                                                <div className="flex justify-between items-start">
                                                    <span className="font-bold text-gray-900">{q.question}</span>
                                                </div>
                                                <p className="text-xs text-gray-400 mt-1">Asked by {isTeacher ? q.author_name : 'a Student'}</p>
                                            </div>
                                            <div className="p-3">
                                                {q.answer ? (
                                                    <div className="text-gray-700 bg-indigo-50/50 p-2 rounded border border-indigo-100">
                                                        <p className="whitespace-pre-wrap">{q.answer}</p>
                                                        <p className="text-[10px] text-indigo-400 mt-2 font-medium bg-white px-1.5 py-0.5 rounded shadow-sm inline-block border border-indigo-50">Teacher Answer</p>
                                                    </div>
                                                ) : isTeacher ? (
                                                    <div>
                                                        {answeringId === q.id ? (
                                                            <div>
                                                                <textarea
                                                                    value={answerText}
                                                                    onChange={e => setAnswerText(e.target.value)}
                                                                    className="w-full border rounded p-2 text-sm min-h-[60px] focus:ring-1 focus:ring-indigo-500 mb-2"
                                                                    placeholder="Type answer..."
                                                                />
                                                                <div className="flex gap-2 justify-end">
                                                                    <button onClick={() => setAnsweringId(null)} className="px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded">Cancel</button>
                                                                    <button onClick={() => submitAnswer(q.id)} className="px-2 py-1 text-xs font-medium bg-indigo-600 text-white hover:bg-indigo-700 rounded">Submit</button>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <button onClick={() => setAnsweringId(q.id)} className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-2 py-1 rounded">Answer Question</button>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <p className="text-xs text-gray-400 italic">Waiting for answer...</p>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )
                        }
                    </div>

                    {currentUser && (
                        <div className="p-4 border-t border-gray-100 bg-white">
                            <form onSubmit={handleAskQuestion}>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        placeholder="Ask a question..."
                                        value={newQuestion}
                                        onChange={e => setNewQuestion(e.target.value)}
                                        className="flex-1 px-3 py-1.5 border rounded-md text-sm bg-gray-50 focus:bg-white"
                                        required
                                    />
                                    <button type="submit" disabled={!newQuestion.trim()} className="bg-indigo-600 text-white px-3 py-1.5 rounded-md text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">Ask</button>
                                </div>
                            </form>
                        </div>
                    )}
                </div>

            </div>

            {/* Add/Edit Resource Modal */}
            {showResourceModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
                        <div className="flex justify-between items-start mb-4">
                            <h2 className="text-lg font-bold">{editingResource ? 'Edit Shared Resource' : 'Add Shared Resource'}</h2>
                            {editingResource && (
                                <button type="button" onClick={() => handleDeleteResource(editingResource.id)} className="text-red-500 hover:text-red-700 text-sm font-medium flex items-center gap-1 p-1 bg-red-50 hover:bg-red-100 rounded transition-colors">
                                    <Trash2 className="w-3.5 h-3.5" /> Delete
                                </button>
                            )}
                        </div>
                        <form onSubmit={handleSaveResource}>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                                    <input type="text" value={newResourceTitle} onChange={e => setNewResourceTitle(e.target.value)} className="w-full px-3 py-2 border rounded-md focus:ring-1 focus:ring-indigo-500 outline-none" required />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">URL / Link</label>
                                    <input type="url" value={newResourceUrl} onChange={e => setNewResourceUrl(e.target.value)} className="w-full px-3 py-2 border rounded-md focus:ring-1 focus:ring-indigo-500 outline-none" required />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                                    <select value={newResourceType} onChange={e => setNewResourceType(e.target.value as any)} className="w-full px-3 py-2 border rounded-md focus:ring-1 focus:ring-indigo-500 outline-none">
                                        <option value="link">External Link</option>
                                        <option value="file">Document/File</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Optional Description</label>
                                    <textarea value={newResourceDescription} onChange={e => setNewResourceDescription(e.target.value)} className="w-full px-3 py-2 border rounded-md text-sm min-h-[60px] focus:ring-1 focus:ring-indigo-500 outline-none" placeholder="Brief note about this resource..." />
                                </div>
                            </div>
                            <div className="flex justify-end gap-3 mt-6">
                                <button type="button" onClick={() => setShowResourceModal(false)} className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 border border-gray-200 rounded-md bg-white hover:bg-gray-50">Cancel</button>
                                <button type="submit" className="px-4 py-2 text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 rounded-md">
                                    {editingResource ? 'Save Changes' : 'Add Resource'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
