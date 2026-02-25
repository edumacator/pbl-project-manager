import React, { useState, useEffect } from 'react';
import { Task, Project } from '../types';
import { X, Save, Calendar, Link as LinkIcon } from 'lucide-react';
import { api } from '../api/client';
import { useToast } from '../contexts/ToastContext';

interface CreateTaskModalProps {
    project: Project;
    existingTasks: Task[];
    isOpen: boolean;
    onClose: () => void;
    onTaskCreated: (task: Task) => void;
    defaultTeamId?: number | null;
    availableMembers?: any[];
    teams?: any[]; // Pass teams for selection
    taskToEdit?: Task | null;
}

const getTaskDepths = (tasks: Task[]): Record<number, number> => {
    const depths: Record<number, number> = {};
    const adj: Record<number, number[]> = {};

    tasks.forEach(t => {
        depths[t.id] = 0;
        adj[t.id] = (t.dependencies || []).map(d => typeof d === 'object' ? (d as any).id : Number(d));
    });

    let changed = true;
    let maxIters = tasks.length;
    while (changed && maxIters > 0) {
        changed = false;
        maxIters--;
        tasks.forEach(t => {
            let maxDepDepth = -1;
            adj[t.id].forEach(depId => {
                if (depths[depId] !== undefined && depths[depId] > maxDepDepth) {
                    maxDepDepth = depths[depId];
                }
            });
            if (maxDepDepth + 1 > depths[t.id]) {
                depths[t.id] = maxDepDepth + 1;
                changed = true;
            }
        });
    }
    return depths;
};

export const CreateTaskModal: React.FC<CreateTaskModalProps> = ({ project, existingTasks, isOpen, onClose, onTaskCreated, defaultTeamId, availableMembers, teams, taskToEdit }) => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [status, setStatus] = useState<'todo' | 'doing' | 'done'>('todo');
    const [assigneeId, setAssigneeId] = useState<number | ''>('');
    const [teamId, setTeamId] = useState<number | ''>(''); // Track selected team
    const [dueDate, setDueDate] = useState('');
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [selectedDependencies, setSelectedDependencies] = useState<number[]>([]);
    const [loading, setLoading] = useState(false);
    const { addToast } = useToast();

    // Reset form when opening
    useEffect(() => {
        if (isOpen) {
            if (taskToEdit) {
                setTitle(taskToEdit.title);
                setDescription(taskToEdit.description || '');
                setStatus(taskToEdit.status as typeof status);
                setAssigneeId(taskToEdit.assignee_id || '');
                setTeamId(taskToEdit.team_id || defaultTeamId || '');
                setDueDate(taskToEdit.due_date ? taskToEdit.due_date.substring(0, 10) : '');
                setStartDate(taskToEdit.start_date ? taskToEdit.start_date.substring(0, 10) : new Date().toISOString().split('T')[0]);
                setSelectedDependencies(taskToEdit.dependencies?.map(d => typeof d === 'object' ? (d as any).id : Number(d)) || []);
            } else {
                setTitle('');
                setDescription('');
                setStatus('todo');
                setAssigneeId('');
                setTeamId(defaultTeamId || '');
                setDueDate('');
                setStartDate(new Date().toISOString().split('T')[0]);
                setSelectedDependencies([]);
            }
        }
    }, [isOpen, taskToEdit, defaultTeamId]);

    const toggleDependency = (taskId: number) => {
        const isSelected = selectedDependencies.includes(taskId);
        const newDeps = isSelected
            ? selectedDependencies.filter(id => id !== taskId)
            : [...selectedDependencies, taskId];

        setSelectedDependencies(newDeps);

        if (!isSelected) {
            // If adding a dependency, set start date to max end date of all dependencies
            const depTask = existingTasks.find(t => t.id === taskId);
            if (depTask?.due_date) {
                const formattedDate = depTask.due_date.substring(0, 10);
                if (formattedDate > startDate) {
                    setStartDate(formattedDate);
                }
            }
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const payload = {
                project_id: project.id,
                title,
                description,
                status,
                assignee_id: assigneeId === '' ? null : Number(assigneeId),
                team_id: teamId || null,
                due_date: dueDate || null,
                start_date: startDate || null,
                dependencies: selectedDependencies
            };

            let res;
            if (taskToEdit) {
                res = await api.updateTask(taskToEdit.id, payload);
                onTaskCreated(res.task || { ...taskToEdit, ...payload });
            } else {
                res = await api.post<Task>(`/projects/${project.id}/tasks`, payload);
                onTaskCreated(res!);
            }
            addToast('Task saved successfully', 'success');
            onClose();
        } catch (error) {
            console.error('Failed to save task:', error);
            addToast('Failed to save task', 'error');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <h2 className="font-semibold text-gray-800">{taskToEdit ? 'Edit Task' : 'Create New Task'}</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-4 overflow-y-auto space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                        <input
                            type="text"
                            required
                            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            placeholder="What needs to be done?"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                        <textarea
                            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all h-24 resize-none"
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            placeholder="Add details..."
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Assignee</label>
                            <select
                                value={assigneeId}
                                onChange={e => setAssigneeId(e.target.value === '' ? '' : Number(e.target.value))}
                                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                            >
                                <option value="">Unassigned</option>
                                {availableMembers && availableMembers.map(m => (
                                    <option key={m.id} value={m.id}>{m.name}</option>
                                ))}
                            </select>
                        </div>

                        {/* Team (Only if no defaultTeamId is locked) */}
                        {!defaultTeamId && teams && teams.length > 0 && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Team</label>
                                <select
                                    value={teamId}
                                    onChange={e => setTeamId(e.target.value === '' ? '' : Number(e.target.value))}
                                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                                >
                                    <option value="">Unassigned</option>
                                    {teams.map(t => (
                                        <option key={t.id} value={t.id}>{t.name}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                            <select
                                value={status}
                                onChange={e => setStatus(e.target.value as any)}
                                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                            >
                                <option value="todo">To Do</option>
                                <option value="doing">In Progress</option>
                                <option value="done">Done</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                                <Calendar className="w-3 h-3" /> Start Date
                            </label>
                            <input
                                type="date"
                                value={startDate}
                                onChange={e => setStartDate(e.target.value)}
                                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                                <Calendar className="w-3 h-3" /> Due Date
                            </label>
                            <input
                                type="date"
                                value={dueDate}
                                onChange={e => setDueDate(e.target.value)}
                                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                            <LinkIcon className="w-3 h-3" /> Dependencies
                        </label>
                        <p className="text-xs text-gray-500 mb-2">Select tasks that must be finished before this one can start.</p>
                        <div className="border border-gray-200 rounded-lg p-3 max-h-40 overflow-y-auto space-y-2 bg-gray-50">
                            {(() => {
                                const taskDepths = getTaskDepths(existingTasks);
                                const filteredTasks = [...existingTasks.filter(t => t.id !== taskToEdit?.id)].sort((a, b) => {
                                    const depthDiff = taskDepths[a.id] - taskDepths[b.id];
                                    if (depthDiff !== 0) return depthDiff;
                                    return a.id - b.id;
                                });

                                if (filteredTasks.length === 0) {
                                    return <div className="text-gray-400 text-sm italic">No other tasks to depend on.</div>;
                                }

                                return filteredTasks.map(task => {
                                    const depth = taskDepths[task.id] || 0;
                                    return (
                                        <label
                                            key={task.id}
                                            className="flex items-center space-x-2 cursor-pointer hover:bg-gray-100 p-1 rounded"
                                            style={{ marginLeft: `${depth * 16}px` }}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={selectedDependencies.includes(task.id)}
                                                onChange={() => toggleDependency(task.id)}
                                                className="rounded text-indigo-600 focus:ring-indigo-500 border-gray-300"
                                            />
                                            <span className="text-sm text-gray-700 truncate">
                                                {depth > 0 ? '└ ' : ''}#{task.id} - {task.title}
                                            </span>
                                        </label>
                                    );
                                });
                            })()}
                        </div>
                    </div>

                    <div className="flex justify-end pt-4 border-t border-gray-100">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg mr-2 text-sm font-medium transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors shadow-sm"
                        >
                            <Save className="w-4 h-4 mr-2" />
                            {loading ? 'Saving...' : (taskToEdit ? 'Save Changes' : 'Create Task')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
