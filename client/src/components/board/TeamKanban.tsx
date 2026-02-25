import React from 'react';
import { Task } from '../../types';

interface TeamKanbanProps {
    tasks: Task[];
    onTaskMove?: (taskId: number, newStatus: string) => void;
    onTaskClaim?: (taskId: number) => void;
    onTaskClick?: (task: Task) => void;
}

const COLUMNS = [
    { id: 'todo', title: 'To Do' },
    { id: 'in_progress', title: 'In Progress' },
    { id: 'blocked', title: 'Blocked' },
    { id: 'review', title: 'Ready for Review' },
    { id: 'done', title: 'Done' }
];

export const TeamKanban: React.FC<TeamKanbanProps> = ({ tasks, onTaskMove, onTaskClaim, onTaskClick }) => {
    return (
        <div className="flex h-full overflow-x-auto p-4 space-x-4">
            {COLUMNS.map(column => (
                <div key={column.id} className="min-w-[280px] w-72 flex-shrink-0 flex flex-col bg-gray-50 rounded-lg h-full">
                    <div className="p-3 border-b border-gray-100 font-medium text-gray-700 flex justify-between items-center">
                        {column.title}
                        <span className="bg-gray-200 text-gray-600 text-xs px-2 py-0.5 rounded-full">
                            {tasks.filter(t => t.status === column.id).length}
                        </span>
                    </div>
                    <div className="flex-1 p-2 overflow-y-auto space-y-2">
                        {tasks.filter(t => t.status === column.id).map(task => (
                            <div
                                key={task.id}
                                className="bg-white p-3 rounded shadow-sm border border-gray-200 cursor-pointer hover:shadow-md transition-shadow"
                                onClick={() => onTaskClick?.(task)}
                            >
                                <div className="text-sm font-medium text-gray-900 mb-1">{task.title}</div>
                                {task.assignee_id ? (
                                    <div className="flex items-center justify-end mt-2">
                                        <div className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-600 text-xs flex items-center justify-center font-medium" title={task.assignee_name || `User ${task.assignee_id}`}>
                                            {task.assignee_name ? task.assignee_name.charAt(0).toUpperCase() : 'U'}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex justify-end mt-2">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); onTaskClaim?.(task.id); }}
                                            className="text-[10px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-600 hover:bg-indigo-100 px-2 py-1 rounded transition-colors"
                                        >
                                            Claim Task
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
};
