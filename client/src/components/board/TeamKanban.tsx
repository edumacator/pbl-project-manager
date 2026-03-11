import React from 'react';
import { Task } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { Plus, ListChecks } from 'lucide-react';

interface TeamKanbanProps {
    tasks: Task[];
    onTaskMove?: (taskId: number, newStatus: string) => void;
    onTaskClaim?: (taskId: number) => void;
    onTaskClick?: (task: Task) => void;
    onTaskAdd?: (status: string) => void;
}

const COLUMNS = [
    { id: 'todo', title: 'To Do' },
    { id: 'doing', title: 'In Progress' },
    { id: 'done', title: 'Done' }
];

const getInitials = (name?: string) => {
    if (!name) return '';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 0) return '';
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
};

export const TeamKanban: React.FC<TeamKanbanProps> = ({ tasks, onTaskMove, onTaskClaim, onTaskClick, onTaskAdd }) => {
    const { user } = useAuth();
    const { addToast } = useToast();

    return (
        <div className="flex h-full overflow-x-auto p-4 space-x-4">
            {COLUMNS.map(column => (
                <div
                    key={column.id}
                    className="bg-gray-100 p-4 rounded-xl min-w-[300px] flex-shrink-0 flex flex-col h-full"
                    onDragOver={(e) => { e.preventDefault(); }}
                    onDrop={(e) => {
                        e.preventDefault();
                        const taskId = Number(e.dataTransfer.getData("taskId"));
                        if (taskId && onTaskMove) {
                            onTaskMove(taskId, column.id);
                        }
                    }}
                >
                    <h3 className="font-semibold text-gray-700 mb-4 flex items-center justify-between">
                        {column.title}
                        <span className="bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full text-xs">
                            {tasks.filter(t => t.status === column.id).length}
                        </span>
                    </h3>
                    <div className="flex-1 overflow-y-auto space-y-3 pr-2">
                        {tasks.filter(t => t.status === column.id).map(task => {
                            const isOwner = task.assignee_id === user?.id;
                            return (
                                <div
                                    key={task.id}
                                    draggable={true} // Always draggable so we can intercept the drag attempt and show the error toast
                                    onDragStart={(e) => {
                                        const canMoveTask = isOwner || user?.role === 'teacher' || user?.role === 'admin';
                                        if (canMoveTask) {
                                            e.dataTransfer.setData("taskId", task.id.toString());
                                        } else {
                                            e.preventDefault();
                                            addToast("You can only move tasks assigned to you.", 'error');
                                        }
                                    }}
                                    className={`bg-white p-4 rounded-lg shadow-sm border ${!task.is_completable && column.id !== 'done' ? 'border-l-4 border-l-amber-400 border-y-gray-200 border-r-gray-200' : 'border-gray-200'} ${(isOwner || user?.role === 'teacher' || user?.role === 'admin') ? 'cursor-grab active:cursor-grabbing hover:shadow-md' : 'cursor-pointer hover:bg-gray-50'} transition-all`}
                                    onClick={() => onTaskClick?.(task)}
                                    title={!task.is_completable ? "Critique Required before Done" : ""}
                                >
                                    <div className="text-sm font-medium text-gray-900 mb-1">{task.title}</div>
                                    <div className="flex items-center justify-between mt-2">
                                        <div className="flex items-center gap-2">
                                            {task.priority && (
                                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${task.priority === 'P1' ? 'bg-red-50 text-red-600 border border-red-100' :
                                                    task.priority === 'P2' ? 'bg-orange-50 text-orange-600 border border-orange-100' :
                                                        'bg-gray-50 text-gray-500 border border-gray-100'
                                                    }`}>
                                                    {task.priority}
                                                </span>
                                            )}
                                            {task.checklist_summary && task.checklist_summary.total > 0 && (
                                                <div className="flex items-center gap-1 text-[10px] font-medium text-gray-500">
                                                    <ListChecks className={`w-3 h-3 ${task.checklist_summary.completed === task.checklist_summary.total ? 'text-green-500' : 'text-gray-400'}`} />
                                                    <span className={task.checklist_summary.completed === task.checklist_summary.total ? 'text-green-600' : ''}>
                                                        {task.checklist_summary.completed}/{task.checklist_summary.total}
                                                    </span>
                                                </div>
                                            )}
                                        </div>

                                        {task.assignee_id ? (
                                            <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 text-[10px] flex items-center justify-center font-bold" title={task.assignee_name || `User ${task.assignee_id}`}>
                                                {getInitials(task.assignee_name) || `U${task.assignee_id}`}
                                            </div>
                                        ) : (
                                            <button
                                                onClick={(e) => { e.stopPropagation(); onTaskClaim?.(task.id); }}
                                                className="text-[10px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-600 hover:bg-indigo-100 px-2 py-1 rounded transition-colors"
                                            >
                                                Claim Task
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                        {onTaskAdd && (
                            <button
                                onClick={() => onTaskAdd(column.id)}
                                className="w-full py-2 mt-2 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-lg text-sm dashed border border-transparent hover:border-gray-300 flex items-center justify-center transition-colors"
                            >
                                <Plus className="w-4 h-4 mr-1" /> Add Task
                            </button>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
};
