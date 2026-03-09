import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api/client';
import { Project, Class, User, Task } from '../types';
import { useToast } from '../contexts/ToastContext';
import { CheckSquare, MessageSquare, BookOpen, Clock, AlertTriangle, Users, Book } from 'lucide-react';

const TeacherStudentDetail: React.FC = () => {
    const [projects, setProjects] = useState<Project[]>([]);
    const [classes, setClasses] = useState<Class[]>([]);
    const [students, setStudents] = useState<User[]>([]);

    const [searchParams, setSearchParams] = useSearchParams();

    const selectedProjectId = searchParams.get('project_id') ? Number(searchParams.get('project_id')) : null;
    const selectedClassId = searchParams.get('class_id') ? Number(searchParams.get('class_id')) : null;
    const selectedStudentId = searchParams.get('student_id') ? Number(searchParams.get('student_id')) : null;

    const setSelectedProjectId = (id: number | null) => {
        setSearchParams(prev => {
            if (id) prev.set('project_id', id.toString());
            else prev.delete('project_id');
            prev.delete('class_id');
            prev.delete('student_id');
            return prev;
        });
    };

    const setSelectedClassId = (id: number | null) => {
        setSearchParams(prev => {
            if (id) prev.set('class_id', id.toString());
            else prev.delete('class_id');
            prev.delete('student_id');
            return prev;
        });
    };

    const setSelectedStudentId = (id: number | null) => {
        setSearchParams(prev => {
            if (id) prev.set('student_id', id.toString());
            else prev.delete('student_id');
            return prev;
        });
    };

    const [loadingProjects, setLoadingProjects] = useState(true);
    const [loadingTasks, setLoadingTasks] = useState(false);

    const [tasks, setTasks] = useState<Task[]>([]);
    const [statusFilter, setStatusFilter] = useState<'all' | 'todo' | 'doing' | 'done'>('all');
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [taskHistory, setTaskHistory] = useState<any[]>([]);
    const [taskReflections, setTaskReflections] = useState<any[]>([]);
    const [taskResources, setTaskResources] = useState<any[]>([]);
    const [taskMessages, setTaskMessages] = useState<any[]>([]);
    const [showFullHistory, setShowFullHistory] = useState(false);

    const { addToast } = useToast();

    // 1. Fetch all projects on mount
    useEffect(() => {
        api.get<Project[]>('/projects')
            .then(data => {
                setProjects(Array.isArray(data) ? data : []);
                setLoadingProjects(false);
            })
            .catch(err => {
                console.error(err);
                addToast("Failed to load projects", "error");
                setLoadingProjects(false);
            });
    }, [addToast]);

    // 2. When Project changes, update available classes
    useEffect(() => {
        setClasses([]);
        setTasks([]);

        if (selectedProjectId) {
            const proj = projects.find(p => p.id === selectedProjectId);
            if (proj && proj.classes) {
                setClasses(proj.classes as unknown as Class[]);
            }
        }
    }, [selectedProjectId, projects]);

    // 3. When Class changes, fetch students
    useEffect(() => {
        setStudents([]);
        setTasks([]);

        if (selectedClassId) {
            api.get<any>(`/classes/${selectedClassId}`)
                .then(data => {
                    if (data && Array.isArray(data.students)) {
                        setStudents(data.students);
                    }
                })
                .catch(err => {
                    console.error(err);
                    addToast("Failed to load students", "error");
                });
        }
    }, [selectedClassId, addToast]);

    // 4. When Student changes, fetch their tasks for the project
    useEffect(() => {
        setTasks([]);
        if (selectedProjectId && selectedClassId && selectedStudentId) {
            fetchStudentTasks(selectedProjectId, selectedClassId, selectedStudentId);
        }
    }, [selectedProjectId, selectedClassId, selectedStudentId]);

    const fetchStudentTasks = async (projectId: number, classId: number, studentId: number) => {
        setLoadingTasks(true);
        try {
            // First find the student's team for this project
            const teams = await api.get<any[]>(`/projects/${projectId}/teams`);

            // A student is in a team if their ID is in team.members
            let teamId = null;
            for (const team of teams) {
                if (team.class_id === classId && team.members?.some((m: any) => m.id === studentId)) {
                    teamId = team.id;
                    break;
                }
            }

            if (teamId) {
                // Fetch tasks for that team
                const allTasks = await api.get<Task[]>(`/projects/${projectId}/tasks?team_id=${teamId}`);

                // Filter to only tasks that are unassigned or assigned specifically to this student
                const studentTasks = allTasks.filter(task => !task.assignee_id || task.assignee_id === studentId);

                // Sort chronologically by default
                studentTasks.sort((a, b) => {
                    const dateA = a.start_date || a.due_date || a.created_at || '';
                    const dateB = b.start_date || b.due_date || b.created_at || '';
                    return new Date(dateA).getTime() - new Date(dateB).getTime();
                });
                setTasks(studentTasks);
            } else {
                addToast("Student does not belong to any team in this project", "warning");
                setTasks([]);
            }
        } catch (error) {
            console.error(error);
            addToast("Failed to load tasks", "error");
        } finally {
            setLoadingTasks(false);
        }
    };

    const handleTaskClick = async (task: Task) => {
        setSelectedTask(task);
        try {
            const [histRes, refRes, resRes, msgRes] = await Promise.all([
                api.get<any[]>(`/tasks/${task.id}/history`).catch(() => []),
                api.get<any[]>(`/tasks/${task.id}/reflections`).catch(() => []),
                api.get<any[]>(`/tasks/${task.id}/resources`).catch(() => []),
                api.get<any[]>(`/tasks/${task.id}/messages`).catch(() => [])
            ]);

            setTaskHistory(histRes || []);
            setTaskReflections(refRes || []);
            setTaskResources(resRes || []);
            setTaskMessages(msgRes || []);
        } catch (error) {
            console.error("Failed to load task details", error);
            addToast("Failed to load some task details", "error");
        }
    };

    const filteredTasks = tasks.filter(t => statusFilter === 'all' || t.status === statusFilter);

    if (loadingProjects) {
        return <div className="p-8">Loading...</div>;
    }

    return (
        <div className="flex flex-col h-full bg-gray-50 border border-transparent">
            {/* Header / Selectors */}
            <div className="bg-white border-b border-gray-200 px-6 py-4 flex flex-col md:flex-row gap-4 items-center shadow-sm">
                <div className="flex items-center gap-2">
                    <Book className="w-5 h-5 text-indigo-500" />
                    <select
                        className="border border-gray-300 bg-white text-gray-900 rounded-md px-3 py-1.5 min-w-[200px] text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        value={selectedProjectId || ''}
                        onChange={(e) => setSelectedProjectId(e.target.value ? Number(e.target.value) : null)}
                    >
                        <option value="">Select a Project...</option>
                        {projects.map(p => (
                            <option key={p.id} value={p.id}>{p.title}</option>
                        ))}
                    </select>
                </div>

                <div className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-indigo-500" />
                    <select
                        className="border border-gray-300 bg-white text-gray-900 rounded-md px-3 py-1.5 min-w-[200px] text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100 disabled:text-gray-500"
                        value={selectedClassId || ''}
                        onChange={(e) => setSelectedClassId(e.target.value ? Number(e.target.value) : null)}
                        disabled={!selectedProjectId || classes.length === 0}
                    >
                        <option value="">Select a Class...</option>
                        {classes.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>
                </div>

                <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xs">S</div>
                    <select
                        className="border border-gray-300 bg-white text-gray-900 rounded-md px-3 py-1.5 min-w-[200px] text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100 disabled:text-gray-500"
                        value={selectedStudentId || ''}
                        onChange={(e) => setSelectedStudentId(e.target.value ? Number(e.target.value) : null)}
                        disabled={!selectedClassId || students.length === 0}
                    >
                        <option value="">Select a Student...</option>
                        {students.map(s => {
                            const displayName = (s.first_name || s.last_name) ? `${s.first_name} ${s.last_name}`.trim() : s.name;
                            return <option key={s.id} value={s.id}>{displayName}</option>;
                        })}
                    </select>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 overflow-hidden p-6">
                {!selectedStudentId ? (
                    <div className="h-full flex items-center justify-center text-gray-500 italic">
                        Select a project, class, and student to view their details.
                    </div>
                ) : (
                    <div className="flex flex-col gap-4 h-full">
                        {/* Student Name Header */}
                        {(() => {
                            const project = projects.find(p => p.id === selectedProjectId);
                            const cls = classes.find(c => c.id === selectedClassId);
                            const student = students.find(s => s.id === selectedStudentId);
                            if (student && project && cls) {
                                const displayName = (student.first_name || student.last_name) ? `${student.first_name} ${student.last_name}`.trim() : student.name;
                                return (
                                    <div className="bg-white px-6 py-4 rounded-xl shadow-sm border border-gray-200">
                                        <div className="flex items-center text-sm text-gray-500 mb-1 space-x-2">
                                            <span>{project.title}</span>
                                            <span className="text-gray-300">/</span>
                                            <span>{cls.name}</span>
                                        </div>
                                        <h1 className="text-2xl font-bold text-gray-900 whitespace-nowrap">
                                            {displayName}
                                        </h1>
                                    </div>
                                );
                            }
                            return null;
                        })()}

                        <div className="flex gap-6 flex-1 min-h-0">
                            {/* Task List */}
                            <div className="w-1/3 bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col overflow-hidden hidden md:flex">
                                <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                                    <h2 className="font-semibold text-gray-800 flex items-center">
                                        <CheckSquare className="w-4 h-4 mr-2 text-indigo-500" />
                                        Tasks
                                    </h2>
                                    <select
                                        className="text-xs border border-gray-300 rounded px-2 py-1"
                                        value={statusFilter}
                                        onChange={(e) => setStatusFilter(e.target.value as any)}
                                    >
                                        <option value="all">All</option>
                                        <option value="todo">To Do</option>
                                        <option value="doing">In Progress</option>
                                        <option value="done">Done</option>
                                    </select>
                                </div>

                                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                                    {loadingTasks ? (
                                        <div className="text-sm text-gray-500 text-center py-4">Loading tasks...</div>
                                    ) : filteredTasks.length === 0 ? (
                                        <div className="text-sm text-gray-500 text-center py-4 italic">No tasks found.</div>
                                    ) : (
                                        filteredTasks.map(task => (
                                            <div
                                                key={task.id}
                                                onClick={() => handleTaskClick(task)}
                                                className={`p-3 rounded-lg border cursor-pointer transition-all ${selectedTask?.id === task.id ? 'border-indigo-400 bg-indigo-50 shadow-sm' : 'border-gray-200 bg-white hover:border-indigo-200 hover:shadow-sm'}`}
                                            >
                                                <div className="flex justify-between items-start mb-1">
                                                    <h3 className="font-medium text-gray-900 text-sm">{task.title}</h3>
                                                    <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase font-bold tracking-wide ${task.status === 'done' ? 'bg-green-100 text-green-700' : task.status === 'doing' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}>
                                                        {task.status}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between items-center text-xs text-gray-500 mt-2">
                                                    <span>{task.due_date ? new Date(task.due_date).toLocaleDateString() : 'No Due Date'}</span>
                                                    {task.assignee_id === selectedStudentId ? (
                                                        <span className="bg-indigo-100 text-indigo-700 px-1.5 rounded text-[10px]">Assigned to Student</span>
                                                    ) : (
                                                        <span className="bg-gray-100 text-gray-600 px-1.5 rounded text-[10px]">Team Task</span>
                                                    )}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>

                            {/* Task Detail Panel */}
                            <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
                                {!selectedTask ? (
                                    <div className="h-full flex flex-col items-center justify-center text-gray-400">
                                        <CheckSquare className="w-12 h-12 mb-4 text-gray-200" />
                                        <p>Select a task from the list to view details.</p>
                                    </div>
                                ) : (
                                    <div className="h-full overflow-y-auto w-full p-6">
                                        <div className="border-b border-gray-100 pb-4 mb-6">
                                            <div className="flex justify-between items-start">
                                                <h2 className="text-2xl font-bold text-gray-900 mb-2">{selectedTask.title}</h2>
                                                <span className={`text-xs px-2 py-1 rounded-full uppercase font-bold tracking-wide ${selectedTask.status === 'done' ? 'bg-green-100 text-green-700' : selectedTask.status === 'doing' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}>
                                                    {selectedTask.status}
                                                </span>
                                            </div>
                                            {selectedTask.description && (
                                                <p className="text-gray-600 text-sm">{selectedTask.description}</p>
                                            )}
                                        </div>

                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                            {/* Left Column */}
                                            <div className="space-y-8">
                                                {/* Task History Panel */}
                                                <section>
                                                    <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center">
                                                        <Clock className="w-4 h-4 mr-2" /> History
                                                    </h3>
                                                    {taskHistory.length === 0 ? (
                                                        <div className="text-sm text-gray-400 italic bg-gray-50 p-3 rounded text-center">No history recorded</div>
                                                    ) : (
                                                        <div className="space-y-4">
                                                            {(showFullHistory ? taskHistory : taskHistory.slice(0, 5)).map((log) => (
                                                                <div key={log.id} className="relative pl-6 before:absolute before:left-[11px] before:top-2 before:bottom-[-16px] before:w-[2px] before:bg-gray-200 last:before:hidden">
                                                                    <div className="absolute left-0 top-1.5 w-[24px] h-[24px] bg-white border-2 border-indigo-200 rounded-full flex items-center justify-center z-10">
                                                                        <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
                                                                    </div>
                                                                    <div className="bg-white p-3 border border-gray-100 rounded-lg shadow-sm">
                                                                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-1 gap-1">
                                                                            <div className="text-xs text-indigo-600 font-semibold">
                                                                                {(() => {
                                                                                    if (log.action === 'UPDATE_TASK_STATUS') {
                                                                                        try {
                                                                                            const details = typeof log.details === 'string' ? JSON.parse(log.details) : log.details;
                                                                                            if (details?.old_status && details?.new_status) {
                                                                                                const formatStatus = (s: string) => s.replace(/_/g, ' ').toUpperCase();
                                                                                                return `Changed Status: ${formatStatus(details.old_status)} ➔ ${formatStatus(details.new_status)}`;
                                                                                            }
                                                                                        } catch (e) { }
                                                                                    }
                                                                                    if (log.action === 'ASSIGNED_TASK') {
                                                                                        return `Assigned Task`;
                                                                                    }
                                                                                    if (log.action === 'UNASSIGNED_TASK') {
                                                                                        return `Unassigned Task`;
                                                                                    }
                                                                                    return log.action.replace(/_/g, ' ');
                                                                                })()}
                                                                            </div>
                                                                            <div className="text-xs text-gray-600 font-medium">By {log.user_name || 'System'} (ID: {log.user_id})</div>
                                                                        </div>
                                                                        <div className="text-[10px] text-gray-400">{new Date(log.created_at).toLocaleString()}</div>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                            {taskHistory.length > 5 && (
                                                                <button
                                                                    onClick={() => setShowFullHistory(!showFullHistory)}
                                                                    className="w-full text-xs text-indigo-600 hover:text-indigo-800 font-medium p-2 bg-indigo-50 hover:bg-indigo-100 rounded transition-colors"
                                                                >
                                                                    {showFullHistory ? 'Show Less' : `Show All History (${taskHistory.length})`}
                                                                </button>
                                                            )}
                                                        </div>
                                                    )}
                                                </section>

                                                {/* Stuck Logs Panel */}
                                                <section>
                                                    <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center">
                                                        <AlertTriangle className="w-4 h-4 mr-2 text-amber-500" /> Stuck Logs
                                                    </h3>
                                                    {selectedTask.is_stuck ? (
                                                        <div className="text-sm text-amber-700 bg-amber-50 p-4 rounded border border-amber-200">
                                                            <p className="font-semibold mb-1">Currently Stuck</p>
                                                            <p>This task is currently marked as stuck. Check the history or discussions for context.</p>
                                                        </div>
                                                    ) : (
                                                        <div className="text-sm text-gray-400 italic bg-gray-50 p-4 rounded text-center border border-dashed border-gray-200">
                                                            No active stuck logs for this task.
                                                        </div>
                                                    )}
                                                </section>
                                            </div>

                                            {/* Right Column */}
                                            <div className="space-y-8">
                                                {/* Resources Panel */}
                                                <section>
                                                    <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center">
                                                        <Book className="w-4 h-4 mr-2 text-blue-500" /> Resources
                                                    </h3>
                                                    {taskResources.length === 0 ? (
                                                        <div className="text-sm text-gray-400 italic bg-gray-50 p-4 rounded text-center border border-dashed border-gray-200">
                                                            No resources attached.
                                                        </div>
                                                    ) : (
                                                        <div className="space-y-2">
                                                            {taskResources.map((res: any) => (
                                                                <a key={res.id} href={res.url} target="_blank" rel="noreferrer" className="block p-3 bg-white border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-sm transition-all">
                                                                    <div className="font-medium text-sm text-blue-600 truncate">{res.title || res.url}</div>
                                                                    <div className="text-xs text-gray-500 mt-1 capitalize">{res.type}</div>
                                                                </a>
                                                            ))}
                                                        </div>
                                                    )}
                                                </section>

                                                {/* Discussions Panel */}
                                                <section>
                                                    <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center">
                                                        <MessageSquare className="w-4 h-4 mr-2 text-indigo-500" /> Discussions
                                                    </h3>
                                                    {taskMessages.length === 0 ? (
                                                        <div className="text-sm text-gray-400 italic bg-gray-50 p-4 rounded text-center border border-dashed border-gray-200">
                                                            No discussions yet.
                                                        </div>
                                                    ) : (
                                                        <div className="space-y-3">
                                                            {taskMessages.map((msg: any) => (
                                                                <div key={msg.id} className="bg-white p-3 border border-gray-100 rounded-lg shadow-sm">
                                                                    <div className="flex justify-between items-center mb-1">
                                                                        <span className="text-sm font-semibold">{msg.user_name || 'User ' + msg.userId}</span>
                                                                        <span className="text-[10px] text-gray-400">{new Date(msg.createdAt || msg.created_at).toLocaleString()}</span>
                                                                    </div>
                                                                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{msg.message}</p>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </section>

                                                {/* Reflections Panel */}
                                                <section>
                                                    <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center">
                                                        <BookOpen className="w-4 h-4 mr-2 text-purple-500" /> Reflections
                                                    </h3>
                                                    {taskReflections.length === 0 ? (
                                                        <div className="text-sm text-gray-400 italic bg-gray-50 p-4 rounded text-center border border-dashed border-gray-200">
                                                            No reflections submitted.
                                                        </div>
                                                    ) : (
                                                        <div className="space-y-3">
                                                            {taskReflections.map((ref: any) => (
                                                                <div key={ref.id} className="bg-purple-50 p-4 border border-purple-100 rounded-lg">
                                                                    <p className="text-sm text-purple-900 italic">"{ref.content}"</p>
                                                                    <p className="text-xs text-purple-600 mt-2 text-right">- {new Date(ref.created_at).toLocaleDateString()}</p>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </section>

                                                {/* Critique Placeholder Panel */}
                                                <section>
                                                    <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center">
                                                        <CheckSquare className="w-4 h-4 mr-2 text-emerald-500" /> Critique
                                                    </h3>
                                                    <div className="text-sm text-emerald-600/70 italic bg-emerald-50 p-4 rounded text-center border border-dashed border-emerald-200">
                                                        (Critique placeholder as requested)
                                                    </div>
                                                </section>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Can use existing TaskDetailsModal or inline like above */}
        </div>
    );
};

export default TeacherStudentDetail;
