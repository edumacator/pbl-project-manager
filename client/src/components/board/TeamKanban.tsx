import React from 'react';
import { Task } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { Plus, ListChecks, Clock, AlertTriangle, Paperclip } from 'lucide-react';

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
    { id: 'stuck', title: 'Stuck' },
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
        <div className="flex h-full overflow-x-auto p-4 space-x-4 snap-x snap-mandatory lg:snap-none">
            {COLUMNS.map(column => (
                <div
                    key={column.id}
                    className="bg-gray-100 p-4 rounded-xl min-w-[280px] sm:min-w-[300px] flex-shrink-0 flex flex-col h-full snap-center"
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
                            {tasks.filter(t => {
                                if (t.parent_task_id) return false;
                                if (column.id === 'stuck') return t.is_stuck;
                                return t.status === column.id && !t.is_stuck;
                            }).length}
                        </span>
                    </h3>
                    <div className="flex-1 overflow-y-auto space-y-3 pr-2">
                        {tasks.filter(t => {
                            if (t.parent_task_id) return false;
                            if (column.id === 'stuck') return t.is_stuck;
                            return t.status === column.id && !t.is_stuck;
                        }).map(task => {
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
                                    className={`bg-white p-4 rounded-lg shadow-sm border ${column.id === 'stuck' ? 'border-amber-400 bg-amber-50/30' : (!task.is_completable && column.id !== 'done' ? 'border-l-4 border-l-amber-400 border-y-gray-200 border-r-gray-200' : 'border-gray-200')} ${(isOwner || user?.role === 'teacher' || user?.role === 'admin') ? 'cursor-grab active:cursor-grabbing hover:shadow-md' : 'cursor-pointer hover:bg-gray-50'} transition-all`}
                                    onClick={() => onTaskClick?.(task)}
                                    title={!task.is_completable ? "Critique Required before Done" : ""}
                                >
                                    <div className="text-sm font-medium text-gray-900 mb-1">{task.title}</div>
                                        <div className="mb-2">
                                            {task.subtask_count !== undefined && task.subtask_count > 0 && (
                                                <div className="w-full">
                                                    <div className="flex justify-between text-[8px] font-bold text-gray-400 mb-1 tracking-tighter">
                                                        <span>PROGRESS</span>
                                                        <span>{Math.round(((task.completed_subtask_count || 0) / task.subtask_count) * 100)}%</span>
                                                    </div>
                                                    <div className="w-full bg-gray-100 h-1 rounded-full overflow-hidden">
                                                        <div 
                                                            className="bg-indigo-500 h-full transition-all duration-300"
                                                            style={{ width: `${((task.completed_subtask_count || 0) / task.subtask_count) * 100}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-50">
                                            <div className="flex items-center gap-2">
                                                {task.assignee_id ? (
                                                    <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 text-[10px] flex items-center justify-center font-bold ring-2 ring-white" title={task.assignee_name || `User ${task.assignee_id}`}>
                                                        {getInitials(task.assignee_name) || `U${task.assignee_id}`}
                                                    </div>
                                                ) : (
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); onTaskClaim?.(task.id); }}
                                                        className="text-[10px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-600 hover:bg-indigo-100 px-2 py-1 rounded transition-colors"
                                                    >
                                                        Claim
                                                    </button>
                                                )}
                                                {task.priority && (
                                                    <span className={`text-[8px] font-black px-1 rounded border uppercase tracking-tighter ${
                                                        task.priority === 'P1' ? 'bg-red-50 text-red-600 border-red-100' :
                                                        task.priority === 'P2' ? 'bg-orange-50 text-orange-600 border-orange-100' :
                                                        'bg-gray-50 text-gray-400 border-gray-100'
                                                    }`}>
                                                        {task.priority}
                                                    </span>
                                                )}
                                                {(task.resource_count ?? 0) > 0 && (
                                                    <div title={`${task.resource_count} resources attached`}>
                                                        <Paperclip className="w-3 h-3 text-indigo-400" />
                                                    </div>
                                                )}
                                                {task.is_stuck && (
                                                    <div title="This task is stuck">
                                                        <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                                                    </div>
                                                )}
                                                {task.checklist_summary && task.checklist_summary.total > 0 && (
                                                    <div className="flex items-center gap-0.5 text-[8px] font-bold text-gray-400" title="Checklist Items">
                                                        <ListChecks className="w-3 h-3" />
                                                        <span>{task.checklist_summary.completed}/{task.checklist_summary.total}</span>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="flex items-center gap-2">
                                                {task.due_date && (
                                                    <div className={`text-[10px] flex items-center gap-1 font-bold italic ${
                                                        task.status !== 'done' && new Date(task.due_date) < new Date() ? 'text-red-500' : 'text-gray-400'
                                                    }`}>
                                                        <Clock className="w-3 h-3" />
                                                        {new Date(task.due_date).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                                        {task.status !== 'done' && new Date(task.due_date) < new Date() && (
                                                            <div title="Overdue">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
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
