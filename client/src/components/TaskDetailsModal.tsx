import React, { useState, useEffect } from 'react';
import { Task, Project, TaskReflection, ProjectResource, TaskMessage } from '../types';
import { X, CheckCircle2, Clock, AlertCircle, Plus, ExternalLink, Link as LinkIcon, FileText, Pencil, AlertTriangle, MessageSquare, Send, Lock, CheckSquare, Square, Trash2, ListChecks, Download } from 'lucide-react';
import { api, API_BASE } from '../api/client';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import StuckTaskModal from './StuckTaskModal';
import { SubtaskList } from './SubtaskList';

interface TaskDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    task: Task | null;
    project: Project;
    onEditTask?: (task: Task) => void;
    onTaskClaim?: (taskId: number) => void;
    onTaskUpdate?: (updatedTask: Task) => void;
}

type TabType = 'overview' | 'reflections' | 'resources' | 'messages';

export const TaskDetailsModal: React.FC<TaskDetailsModalProps> = ({ isOpen, onClose, task, project, onEditTask, onTaskClaim, onTaskUpdate }) => {
    const [activeTab, setActiveTab] = useState<TabType>('overview');
    const [reflections, setReflections] = useState<TaskReflection[]>([]);
    const [resources, setResources] = useState<ProjectResource[]>([]);
    const [messages, setMessages] = useState<TaskMessage[]>([]);
    const [newReflection, setNewReflection] = useState('');
    const [newMessage, setNewMessage] = useState('');
    const [messageVisibility, setMessageVisibility] = useState<'team' | 'teacher'>('team');
    const [newResourceTitle, setNewResourceTitle] = useState('');
    const [newResourceUrl, setNewResourceUrl] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [uploadMode, setUploadMode] = useState(false);
    const [loading, setLoading] = useState(false);
    const [localTask, setLocalTask] = useState<Task | null>(task);
    const { addToast } = useToast();
    const { user } = useAuth();
    const [isStuck, setIsStuck] = useState(task?.is_stuck || false);
    const [showStuckModal, setShowStuckModal] = useState(false);
    const [checklist, setChecklist] = useState<any[]>([]);
    const [newChecklistItem, setNewChecklistItem] = useState('');
    const [showChecklist, setShowChecklist] = useState(false);
    const [localPriority, setLocalPriority] = useState<'P1' | 'P2' | 'P3'>(task?.priority || 'P3');

    useEffect(() => {
        setIsStuck(task?.is_stuck || false);
        setLocalPriority(task?.priority || 'P3');
    }, [task]);

    const isTeacher = user?.role === 'teacher' || user?.role === 'admin';
    const isOwner = task?.assignee_id === user?.id;
    const canEdit = isTeacher || isOwner;

    const fetchData = async () => {
        if (!task) return;
        setLoading(true);
        try {
            const [taskRes, refRes, resRes, msgRes, checkRes] = await Promise.all([
                api.get<Task>(`/tasks/${task.id}`),
                api.get<TaskReflection[]>(`/tasks/${task.id}/reflections`).catch(() => []),
                api.get<ProjectResource[]>(`/tasks/${task.id}/resources`).catch(() => []),
                api.get<TaskMessage[]>(`/tasks/${task.id}/messages`).catch(() => []),
                api.get<any[]>(`/tasks/${task.id}/checklist`).catch(() => [])
            ]);
            if (taskRes) setLocalTask(taskRes);
            setReflections(refRes || []);
            setResources(resRes || []);
            setMessages(msgRes || []);
            setChecklist(checkRes || []);
            setShowChecklist((checkRes || []).length > 0);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen && task) {
            setLocalTask(task);
            fetchData();
            setActiveTab('overview');
        }
    }, [isOpen, task?.id]);

    const handleToggleStuck = async () => {
        if (!task) return;
        const newStuckState = !isStuck;
        setIsStuck(newStuckState);
        try {
            const res = await api.post<{ ok: boolean, task: Task }>(`/tasks/${task.id}/toggle-stuck`, { is_stuck: newStuckState });
            addToast(newStuckState ? "Task marked as stuck." : "Task marked as unstuck.", "success");
            
            if (onTaskUpdate && res.task) onTaskUpdate(res.task);

            // Trigger the stuck decision tree if marked as stuck
            if (newStuckState) {
                setShowStuckModal(true);
            }
        } catch (err) {
            console.error("Failed to toggle stuck state", err);
            setIsStuck(!newStuckState); // Revert
            addToast("Failed to update task state.", "error");
        }
    };

    const handleStuckResolved = () => {
        setShowStuckModal(false);
        setIsStuck(false); // Task is now unstuck!
        fetchData();
        // You could also invoke a parent callback to refresh kanban board if needed 
        // using onTaskClaim or similar to push reload to parent, but we'll stick to this for now.
    };
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

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !task) return;
        setLoading(true);
        try {
            await api.post(`/tasks/${task.id}/messages`, { message: newMessage, visibility: messageVisibility });
            setNewMessage('');
            fetchData();
        } catch (err) {
            console.error(err);
            addToast("Failed to send message.", "error");
        } finally {
            setLoading(false);
        }
    };

    const handleAddResource = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!task) return;
        if (!uploadMode && (!newResourceTitle.trim() || !newResourceUrl.trim())) return;
        if (uploadMode && !file) return;

        try {
            if (uploadMode && file) {
                const formData = new FormData();
                formData.append('file', file);
                formData.append('title', newResourceTitle.trim() || file.name);
                formData.append('task_id', task.id.toString());

                await fetch(`${API_BASE}/projects/${project.id}/resources/upload`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
                    },
                    body: formData
                }).then(async (res) => {
                    if (!res.ok) throw new Error('Upload failed');
                    return res.json();
                });
            } else {
                await api.post(`/projects/${project.id}/resources`, {
                    task_id: task.id,
                    title: newResourceTitle,
                    url: newResourceUrl,
                    type: 'link'
                });
            }
            setNewResourceTitle('');
            setNewResourceUrl('');
            setFile(null);
            fetchData();
            setUploadMode(false);
            addToast("Resource added successfully", "success");
        } catch (err) {
            console.error(err);
            addToast("Failed to add resource.", "error");
        }
    };

    const handleAddChecklistItem = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!newChecklistItem.trim() || !task || !canEdit) return;
        try {
            const newItem = await api.post(`/tasks/${task.id}/checklist`, { content: newChecklistItem.trim() });
            setChecklist([...checklist, newItem]);
            setNewChecklistItem('');
        } catch (err) {
            console.error(err);
            addToast("Failed to add checklist item.", "error");
        }
    };

    const handleToggleChecklistItem = async (item: any) => {
        if (!canEdit) return;
        try {
            const updated = await api.patch(`/checklist-items/${item.id}`, { is_completed: !item.is_completed });
            setChecklist(checklist.map(i => i.id === item.id ? updated : i));
        } catch (err) {
            console.error(err);
            addToast("Failed to update item.", "error");
        }
    };

    const handleDeleteChecklistItem = async (itemId: number) => {
        if (!canEdit) return;
        try {
            await api.delete(`/checklist-items/${itemId}`);
            setChecklist(checklist.filter(i => i.id !== itemId));
        } catch (err) {
            console.error(err);
            addToast("Failed to delete item.", "error");
        }
    };

    const handleConvertToSubtask = async (item: any) => {
        if (!canEdit || !task) return;
        setLoading(true);
        try {
            // 1. Create subtask
            await api.post(`/projects/${project.id}/tasks`, {
                project_id: project.id,
                team_id: task.team_id,
                title: item.content,
                parent_task_id: task.id,
                status: item.is_completed ? 'done' : 'todo',
                priority: 'P3'
            });

            // 2. Delete checklist item
            await api.delete(`/checklist-items/${item.id}`);
            
            // 3. Refresh data
            setChecklist(checklist.filter(i => i.id !== item.id));
            fetchData();
            
            // 4. Trigger parent refresh
            if (onTaskUpdate) {
                const updatedTask = await api.get<Task>(`/tasks/${task.id}`);
                onTaskUpdate(updatedTask);
            }
            
            addToast("Converted checklist item to subtask", "success");
        } catch (err) {
            console.error(err);
            addToast("Failed to convert item.", "error");
        } finally {
            setLoading(false);
        }
    };

    const handlePriorityChange = async (newPriority: 'P1' | 'P2' | 'P3') => {
        if (!task || !canEdit) return;
        setLocalPriority(newPriority);
        try {
            const res = await api.updateTask(task.id, { priority: newPriority });
            if (onTaskUpdate && res.task) onTaskUpdate(res.task);
            addToast(`Priority updated to ${newPriority}`, "success");
        } catch (err) {
            console.error(err);
            setLocalPriority(task.priority || 'P3');
            addToast("Failed to update priority.", "error");
        }
    };

    const handleExportTask = () => {
        if (!task) return;
        const token = localStorage.getItem('auth_token');
        const url = `${API_BASE}/calendar/events/task-${task.id}/ics${token ? `?token=${token}` : ''}`;
        window.open(url, '_blank');
    };

    if (!isOpen || !task) return null;

    const StatusIcon = task.status === 'done' ? CheckCircle2 : (task.status === 'doing' ? Clock : AlertCircle);
    const statusColor = task.status === 'done' ? 'text-green-500' : (task.status === 'doing' ? 'text-blue-500' : 'text-gray-400');

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
                    {(task?.is_stuck || messages.length > 0) && (
                        <button
                            onClick={() => setActiveTab('messages')}
                            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'messages' ? 'border-amber-500 text-amber-700' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                        >
                            Discussion {messages.length > 0 && <span className="bg-amber-100 text-amber-800 text-[10px] px-1.5 py-0.5 rounded-full">{messages.length}</span>}
                        </button>
                    )}
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
                                <div className="bg-white p-4 justify-between flex items-center rounded-xl border border-gray-100 shadow-sm transition-colors group/date">
                                    <span className="text-sm text-gray-500">Due Date</span>
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium text-gray-900">{task.due_date ? task.due_date.substring(0, 10) : '-'}</span>
                                        {isOwner && task.due_date && (
                                            <button 
                                                onClick={handleExportTask}
                                                className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-all active:scale-90"
                                                title="Add to Calendar (.ics)"
                                            >
                                                <Download size={14} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                                <div className="bg-white p-4 justify-between flex rounded-xl border border-gray-100 shadow-sm">
                                    <span className="text-sm text-gray-500">Dependencies</span>
                                    <span className="font-medium text-gray-900">{task.dependencies && task.dependencies.length > 0 ? `${task.dependencies.length} tasks` : 'None'}</span>
                                </div>
                                <div className="bg-white p-4 justify-between flex items-center rounded-xl border border-gray-100 shadow-sm">
                                    <span className="text-sm text-gray-500">Priority</span>
                                    {canEdit ? (
                                        <select
                                            value={localPriority}
                                            onChange={(e) => handlePriorityChange(e.target.value as any)}
                                            className={`text-sm font-bold px-2 py-1 rounded border transition-colors ${localPriority === 'P1' ? 'border-red-200 bg-red-50 text-red-700' :
                                                localPriority === 'P2' ? 'border-orange-200 bg-orange-50 text-orange-700' :
                                                    'border-gray-200 bg-gray-50 text-gray-700'
                                                }`}
                                        >
                                            <option value="P1">P1 - Critical</option>
                                            <option value="P2">P2 - High</option>
                                            <option value="P3">P3 - Normal</option>
                                        </select>
                                    ) : (
                                        <span className={`text-sm font-bold px-2 py-1 rounded ${localPriority === 'P1' ? 'bg-red-50 text-red-700' :
                                            localPriority === 'P2' ? 'bg-orange-50 text-orange-700' :
                                                'bg-gray-50 text-gray-700'
                                            }`}>
                                            {localPriority}
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Checklist Section */}
                            <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                                        <ListChecks className="w-4 h-4 text-indigo-500" />
                                        Task Checklist
                                    </h3>
                                    {!showChecklist && canEdit && (
                                        <button
                                            onClick={() => setShowChecklist(true)}
                                            className="text-xs font-medium text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                                        >
                                            <Plus className="w-3 h-3" /> Add Checklist
                                        </button>
                                    )}
                                </div>

                                {showChecklist ? (
                                    <div className="space-y-3">
                                        {checklist.length > 0 && (
                                            <div className="mb-4">
                                                <div className="flex justify-between text-xs text-gray-500 mb-1">
                                                    <span>{checklist.filter(i => i.is_completed).length} / {checklist.length} complete</span>
                                                    <span>{Math.round((checklist.filter(i => i.is_completed).length / checklist.length) * 100)}%</span>
                                                </div>
                                                <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                                                    <div
                                                        className="bg-indigo-500 h-full transition-all duration-500"
                                                        style={{ width: `${(checklist.filter(i => i.is_completed).length / checklist.length) * 100}%` }}
                                                    />
                                                </div>
                                            </div>
                                        )}

                                        <div className="space-y-2">
                                            {checklist.map(item => (
                                                <div key={item.id} className="group flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg transition-colors">
                                                    <button
                                                        onClick={() => handleToggleChecklistItem(item)}
                                                        disabled={!canEdit}
                                                        className={`transition-colors ${item.is_completed ? 'text-green-500' : 'text-gray-300 group-hover:text-gray-400'} ${!canEdit ? 'cursor-default' : ''}`}
                                                    >
                                                        {item.is_completed ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
                                                    </button>
                                                    <span className={`flex-1 text-sm ${item.is_completed ? 'text-gray-400 line-through' : 'text-gray-700'}`}>
                                                        {item.content}
                                                    </span>
                                                    {canEdit && (
                                                        <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-all">
                                                            <button
                                                                onClick={() => handleConvertToSubtask(item)}
                                                                className="p-1 text-gray-400 hover:text-indigo-600 transition-all"
                                                                title="Convert to Subtask"
                                                            >
                                                                <ExternalLink className="w-4 h-4" />
                                                            </button>
                                                            <button
                                                                onClick={() => handleDeleteChecklistItem(item.id)}
                                                                className="p-1 text-gray-400 hover:text-red-500 transition-all"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>

                                        {canEdit && (
                                            <form onSubmit={handleAddChecklistItem} className="mt-4">
                                                <input
                                                    type="text"
                                                    value={newChecklistItem}
                                                    onChange={(e) => setNewChecklistItem(e.target.value)}
                                                    placeholder="Add a step..."
                                                    className="w-full text-sm p-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                                                />
                                                <p className="text-[10px] text-gray-400 mt-1 italic">Press Enter to add and keep typing</p>
                                            </form>
                                        )}

                                        {checklist.length > 0 && checklist.every(i => i.is_completed) && task.status !== 'done' && (
                                            <div className="mt-4 p-3 bg-green-50 rounded-lg border border-green-100 animate-in fade-in slide-in-from-top-2">
                                                <p className="text-xs text-green-700 font-medium flex items-center gap-2">
                                                    <CheckCircle2 className="w-4 h-4" />
                                                    All steps complete! Ready to move this task to Done?
                                                </p>
                                            </div>
                                        )}

                                        {checklist.length > 8 && (
                                            <p className="text-[10px] text-amber-600 mt-2 italic">
                                                Try keeping this to just the key steps.
                                            </p>
                                        )}
                                    </div>
                                ) : (
                                    <div className="text-center py-4 bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
                                        <p className="text-xs text-gray-500 mb-2">Helpful for breaking work into smaller pieces.</p>
                                        {canEdit && (
                                            <button
                                                onClick={() => setShowChecklist(true)}
                                                className="text-xs font-bold uppercase tracking-wider bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 px-3 py-1.5 rounded-lg shadow-sm transition-all"
                                            >
                                                Start a Checklist
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Subtasks Section */}
                            {!task.parent_task_id && localTask && (
                                <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                                    <SubtaskList 
                                        parentTask={localTask}
                                        project={project}
                                        subtasks={localTask.subtasks || []}
                                        onSubtaskUpdate={() => {
                                            fetchData();
                                            // Trigger parent refresh to update progress on Kanban
                                            if (onTaskUpdate) {
                                                api.get<Task>(`/tasks/${task.id}`).then(updatedTask => {
                                                    onTaskUpdate(updatedTask);
                                                });
                                            }
                                        }}
                                        canEdit={canEdit}
                                    />
                                </div>
                            )}

                            {/* Stuck State Toggle */}
                            {isOwner && (
                                <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between mt-6">
                                    <div>
                                        <h3 className="text-sm font-semibold text-gray-900 flex items-center">
                                            <AlertTriangle className={`w-4 h-4 mr-2 ${isStuck ? 'text-amber-500' : 'text-gray-400'}`} />
                                            Task Status Blocked?
                                        </h3>
                                        <p className="text-xs text-gray-500 mt-1">If you're unsure how to proceed, mark this task as stuck.</p>
                                    </div>
                                    <button
                                        onClick={handleToggleStuck}
                                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${isStuck
                                            ? 'bg-amber-100 text-amber-800 hover:bg-amber-200 border border-amber-300'
                                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-transparent'
                                            }`}
                                    >
                                        {isStuck ? 'Unmark as Stuck' : 'Mark as Stuck'}
                                    </button>
                                </div>
                            )}
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
                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${ref.transition_type === 'start_work' ? 'bg-blue-50 text-blue-700' : 'bg-green-50 text-green-700'}`}>
                                                        {ref.transition_type === 'start_work' ? 'Starting Work' : 'Task Finished'}
                                                    </span>
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
                                            <input
                                                type="file"
                                                onChange={(e) => setFile(e.target.files?.[0] || null)}
                                                className="flex-1 text-sm p-3 bg-transparent border-0 focus:ring-0 focus:outline-none max-w-full text-gray-700"
                                            />
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
                                            disabled={(!uploadMode && !newResourceUrl.trim()) || (uploadMode && !file) || loading}
                                            className="w-full bg-slate-900 text-white px-4 py-3 rounded-xl text-sm font-bold hover:bg-slate-800 disabled:opacity-50 transition-colors shadow-sm"
                                        >
                                            Attach Resource
                                        </button>
                                    </div>
                                </div>
                            </form>
                        </div>
                    )}

                    {activeTab === 'messages' && (
                        <div className="h-full flex flex-col bg-gray-50 rounded-xl overflow-hidden border border-gray-100">
                            {/* Messages List Area */}
                            <div className="flex-1 overflow-y-auto p-5 space-y-4 max-h-[400px]">
                                {messages.length === 0 ? (
                                    <div className="text-center text-gray-500 py-10 flex flex-col items-center">
                                        <MessageSquare className="w-10 h-10 text-gray-300 mb-2" />
                                        <p className="text-sm font-medium">No messages yet.</p>
                                        <p className="text-xs text-gray-400">Start the discussion below.</p>
                                    </div>
                                ) : (
                                    messages.map((msg, idx) => {
                                        const isCurrentUser = msg.user_id === user?.id;
                                        return (
                                            <div key={msg.id || idx} className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}>
                                                <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${isCurrentUser ? 'bg-indigo-600 text-white rounded-br-none shadow-sm' : 'bg-white text-gray-900 border border-gray-100 rounded-bl-none shadow-sm'}`}>
                                                    {msg.visibility === 'teacher' && (
                                                        <div className={`flex items-center gap-1 text-[10px] uppercase font-bold mb-1 ${isCurrentUser ? 'text-indigo-200' : 'text-amber-600'}`}>
                                                            <Lock className="w-3 h-3" /> Private (Teacher & Assignee)
                                                        </div>
                                                    )}
                                                    {!isCurrentUser && (
                                                        <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">{msg.user_name}</div>
                                                    )}
                                                    <div className="text-sm whitespace-pre-wrap">{msg.message}</div>
                                                    <div className={`text-[10px] mt-2 text-right ${isCurrentUser ? 'text-indigo-200' : 'text-gray-400'}`}>
                                                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>

                            {/* Message Input Area */}
                            <div className="p-4 bg-white border-t border-gray-100">
                                <div className="flex items-center gap-2 mb-3">
                                    <button
                                        type="button"
                                        onClick={() => setMessageVisibility('team')}
                                        className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${messageVisibility === 'team' ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                                    >
                                        Team Pings
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setMessageVisibility('teacher')}
                                        className={`text-xs px-3 py-1.5 rounded-full font-medium flex items-center gap-1 transition-colors ${messageVisibility === 'teacher' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                                    >
                                        <Lock className="w-3 h-3" /> Teacher Only
                                    </button>
                                </div>
                                <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                                    <div className="flex-1 relative">
                                        <input
                                            type="text"
                                            value={newMessage}
                                            onChange={(e) => setNewMessage(e.target.value)}
                                            placeholder={messageVisibility === 'team' ? "Message the team..." : "Private message to teacher..."}
                                            disabled={loading}
                                            className="w-full bg-gray-50 border border-gray-200 rounded-full px-4 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:bg-gray-100 transition-colors py-2.5"
                                        />
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={!newMessage.trim() || loading}
                                        className="p-2.5 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
                                    >
                                        <Send className="w-4 h-4" />
                                    </button>
                                </form>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Render the action tree modal overlaid on top if active */}
            {showStuckModal && (
                <StuckTaskModal
                    task={task}
                    onClose={() => setShowStuckModal(false)}
                    onResolved={handleStuckResolved}
                />
            )}
        </div>
    );
};
