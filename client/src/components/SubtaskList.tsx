import React, { useState } from 'react';
import { Task, Project } from '../types';
import { Plus, Trash2, CheckSquare, Square, Layout, User } from 'lucide-react';
import { api } from '../api/client';
import { useToast } from '../contexts/ToastContext';
import { CreateTaskModal } from './CreateTaskModal';

interface SubtaskListProps {
    parentTask: Task;
    project: Project;
    subtasks: Task[];
    onSubtaskUpdate: () => void;
    onTaskClick?: (task: Task) => void;
    canEdit: boolean;
}

export const SubtaskList: React.FC<SubtaskListProps> = ({ 
    parentTask, 
    project, 
    subtasks, 
    onSubtaskUpdate, 
    onTaskClick,
    canEdit 
}) => {
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [quickAddTitle, setQuickAddTitle] = useState('');
    const [loading, setLoading] = useState(false);
    const { addToast } = useToast();

    const handleQuickAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!quickAddTitle.trim() || !canEdit) return;

        setLoading(true);
        try {
            await api.post(`/projects/${project.id}/tasks`, {
                project_id: project.id,
                team_id: parentTask.team_id,
                title: quickAddTitle.trim(),
                parent_task_id: parentTask.id,
                status: 'todo',
                priority: 'P3'
            });
            setQuickAddTitle('');
            onSubtaskUpdate();
            addToast('Subtask added', 'success');
        } catch (err) {
            console.error(err);
            addToast('Failed to add subtask', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleToggleStatus = async (subtask: Task) => {
        if (!canEdit) return;
        const newStatus = subtask.status === 'done' ? 'todo' : 'done';
        try {
            await api.updateTask(subtask.id, { status: newStatus });
            onSubtaskUpdate();
        } catch (err) {
            console.error(err);
            addToast('Failed to update subtask', 'error');
        }
    };

    const handleDelete = async (subtaskId: number) => {
        if (!canEdit) return;
        if (!window.confirm('Are you sure you want to delete this subtask?')) return;
        try {
            await api.hardDeleteTask(subtaskId);
            onSubtaskUpdate();
            addToast('Subtask deleted', 'success');
        } catch (err) {
            console.error(err);
            addToast('Failed to delete subtask', 'error');
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                    <Layout className="w-4 h-4 text-indigo-500" />
                    Subtasks
                </h3>
                {canEdit && (
                    <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="text-xs font-medium text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                    >
                        <Plus className="w-3 h-3" /> Full Editor
                    </button>
                )}
            </div>

            {subtasks.length > 0 ? (
                <div className="space-y-2">
                    {subtasks.map(st => (
                        <div key={st.id} className="group flex items-center gap-3 p-3 bg-white hover:bg-gray-50 rounded-xl border border-gray-100 shadow-sm transition-all">
                            <button
                                onClick={() => handleToggleStatus(st)}
                                disabled={!canEdit}
                                className={`transition-colors ${st.status === 'done' ? 'text-green-500' : 'text-gray-300 group-hover:text-gray-400'}`}
                            >
                                {st.status === 'done' ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
                            </button>
                            
                            <div 
                                className={`flex-1 min-w-0 ${onTaskClick ? 'cursor-pointer hover:bg-gray-100/50 p-1 -m-1 rounded-lg transition-colors' : ''}`}
                                onClick={() => onTaskClick?.(st)}
                            >
                                <div className={`text-sm font-medium truncate ${st.status === 'done' ? 'text-gray-400 line-through' : 'text-gray-900 group-hover:text-indigo-600 transition-colors'}`}>
                                    {st.title}
                                </div>
                                <div className="flex items-center gap-3 mt-1 text-[10px] text-gray-500">
                                    {st.assignee_id && (
                                        <span className="flex items-center gap-1 bg-gray-100 px-1.5 py-0.5 rounded text-gray-600">
                                            <User className="w-2.5 h-2.5" />
                                            {st.assignee_name || `User ${st.assignee_id}`}
                                        </span>
                                    )}
                                    {st.due_date && (
                                        <span className="text-orange-600 font-medium">
                                            Due {new Date(st.due_date).toLocaleDateString()}
                                        </span>
                                    )}
                                </div>
                            </div>

                            {canEdit && (
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={() => handleDelete(st.id)}
                                        className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors"
                                        title="Delete Subtask"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-6 bg-white rounded-xl border border-dashed border-gray-200">
                    <p className="text-xs text-gray-500">Break this task down into smaller, manageable subtasks.</p>
                </div>
            )}

            {canEdit && (
                <form onSubmit={handleQuickAdd} className="relative">
                    <input
                        type="text"
                        value={quickAddTitle}
                        onChange={(e) => setQuickAddTitle(e.target.value)}
                        placeholder="Quick add subtask..."
                        className="w-full text-sm p-3 pr-10 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm transition-all"
                    />
                    <button
                        type="submit"
                        disabled={!quickAddTitle.trim() || loading}
                        className="absolute right-2 top-1.5 p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg disabled:opacity-50 transition-colors"
                    >
                        <Plus className="w-5 h-5" />
                    </button>
                </form>
            )}

            {isCreateModalOpen && (
                <CreateTaskModal
                    isOpen={isCreateModalOpen}
                    onClose={() => setIsCreateModalOpen(false)}
                    project={project}
                    existingTasks={[]} // We don't need existing tasks for simple subtask creation
                    onTaskCreated={() => {
                        setIsCreateModalOpen(false);
                        onSubtaskUpdate();
                    }}
                    defaultTeamId={parentTask.team_id}
                    parentTaskId={parentTask.id}
                    availableMembers={parentTask.team_id ? [] : undefined} // Ideally pass team members here
                />
            )}
        </div>
    );
};
