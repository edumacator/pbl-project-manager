import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { ProjectTimeline, Task, Project } from '../types';
import { Plus } from 'lucide-react';

interface TimelineViewProps {
    teamId: number;
    projectProp?: Project;
    onAddTask?: () => void;
    showArchived?: boolean;
    onTaskClick?: (task: Task) => void;
    refreshTrigger?: number;
}

const TimelineView: React.FC<TimelineViewProps> = ({ teamId, projectProp, onAddTask, showArchived = false, onTaskClick, refreshTrigger = 0 }) => {
    const [timeline, setTimeline] = useState<ProjectTimeline | null>(null);
    const [optimisticTasks, setOptimisticTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [draggedTaskId, setDraggedTaskId] = useState<number | null>(null);
    const [dragOverTaskId, setDragOverTaskId] = useState<number | null>(null);

    // Horizontal Dragging State
    const [horizontalDragState, setHorizontalDragState] = useState<{
        taskId: number;
        mode: 'start' | 'end' | 'move';
        startX: number;
        originalStartCol: number;
        originalDuration: number;
        pointerId: number;
        target: HTMLElement;
    } | null>(null);

    const timelineGridRef = React.useRef<HTMLDivElement>(null);
    const dragInteractionRef = React.useRef<{ lastDragEnd: number, dragged: boolean }>({ lastDragEnd: 0, dragged: false });
    const draggedTaskRef = React.useRef<Task | null>(null);

    const fetchTimeline = async () => {
        try {
            const url = `/teams/${teamId}/timeline${showArchived ? '?include_deleted=true' : ''}`;
            const data = await api.get<ProjectTimeline>(url);
            setTimeline(data);
            setOptimisticTasks(data.tasks);
        } catch (err: any) {
            setError(err.message || 'Failed to fetch timeline');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTimeline();
    }, [teamId, showArchived, refreshTrigger]);

    if (loading) return <div className="p-4">Loading timeline...</div>;
    if (error) return <div className="p-4 text-red-500">Error: {error}</div>;
    if (!timeline) return <div className="p-4">No timeline data.</div>;

    const { project: timelineProject, milestones } = timeline;
    const tasks = optimisticTasks;
    const project = (projectProp || timelineProject) as Project;

    const parseDate = (dateStr: string | null | undefined): Date => {
        if (!dateStr) return new Date();
        const parts = dateStr.substring(0, 10).split('-');
        if (parts.length === 3) {
            return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
        }
        return new Date(dateStr);
    };

    // Calculate dynamic start/end dates based on project, tasks, and milestones
    const todayMidnight = new Date();
    todayMidnight.setHours(0, 0, 0, 0);
    const todayTime = todayMidnight.getTime();

    const allDates: number[] = [
        todayTime, // Include today
        project.start_date ? parseDate(project.start_date).getTime() : todayTime,
        project.created_at ? parseDate(project.created_at).getTime() : todayTime,
        project.due_date ? parseDate(project.due_date).getTime() : todayTime
    ];

    tasks.forEach(t => {
        if (t.start_date) allDates.push(parseDate(t.start_date).getTime());
        if (t.due_date) allDates.push(parseDate(t.due_date).getTime());
    });

    milestones.forEach(m => {
        if (m.due_date) allDates.push(parseDate(m.due_date).getTime());
    });

    const minDate = Math.min(...allDates);
    const maxDate = Math.max(...allDates);

    const startDate = new Date(minDate);
    const endDate = new Date(maxDate);

    // Normalize start/end to midnight for consistent grid
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(0, 0, 0, 0);

    // Add padding
    startDate.setDate(startDate.getDate() - 3);
    endDate.setDate(endDate.getDate() + 7);

    // Calculate total days for grid columns
    let totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    if (Number.isNaN(totalDays) || totalDays < 1) totalDays = 30; // Fallback to safe default

    const dates = Array.from({ length: totalDays }, (_, i) => {
        const d = new Date(startDate);
        d.setDate(d.getDate() + i);
        return d;
    });

    const getGridColumnStart = (dateStr: string | null | undefined) => {
        if (!dateStr) return 1;
        const date = parseDate(dateStr);
        date.setHours(0, 0, 0, 0);

        const diff = Math.round((date.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        return Math.max(1, Math.min(diff + 1, totalDays + 1));
    };

    const getDependencies = (task: Task) => {
        return (task.dependencies || []).map(d => typeof d === 'object' ? (d as any).id : Number(d));
    };

    const ROW_PITCH = 48; // 40px height + 8px gap

    // Drag and Drop (Vertical Sorting) Handlers
    const handleDragStart = (e: React.DragEvent, taskId: number) => {
        setDraggedTaskId(taskId);
        e.dataTransfer.effectAllowed = 'move';
        // Need to set data or drag won't fire in firefox
        e.dataTransfer.setData('text/plain', taskId.toString());
    };

    const handleDragOver = (e: React.DragEvent, taskId: number) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        if (taskId !== dragOverTaskId) {
            setDragOverTaskId(taskId);
        }
    };

    const handleDragLeave = () => {
        setDragOverTaskId(null);
    };

    const handleDrop = async (e: React.DragEvent, targetTaskId: number) => {
        e.preventDefault();
        setDragOverTaskId(null);
        if (draggedTaskId === null || draggedTaskId === targetTaskId) {
            setDraggedTaskId(null);
            return;
        }

        const draggedIndex = tasks.findIndex(t => t.id === draggedTaskId);
        const targetIndex = tasks.findIndex(t => t.id === targetTaskId);

        if (draggedIndex === -1 || targetIndex === -1) return;

        // Optimistically update: move dragged item to target index
        const newTasks = [...tasks];
        const [draggedTask] = newTasks.splice(draggedIndex, 1);
        newTasks.splice(targetIndex, 0, draggedTask);

        // Advanced sorting: Ensure dependencies stay under parents. 
        // We will do a generic topological group: tasks with empty dependencies go first (or wherever they were dropped),
        // but if a task HAS dependencies, it must logically follow its parent(s) in the list.
        // We can respect the user's manual drag (so they can put a root task at the bottom), 
        // but we force children to stick tightly underneath their direct dependencies.

        let finalizedTasks: Task[] = [];
        const addedTaskIds = new Set<number>();

        // Recursively add task and all its dependent children
        const addWithChildren = (taskId: number) => {
            if (addedTaskIds.has(taskId)) return;
            const task = newTasks.find(t => t.id === taskId);
            if (!task) return;

            finalizedTasks.push(task);
            addedTaskIds.add(taskId);

            // Find any tasks that depend on THIS task, and add them immediately underneath
            const children = newTasks.filter(t => t.dependencies?.includes(taskId));
            // Sort children by their current relative order in `newTasks` so dragging siblings works
            children.sort((a, b) => newTasks.indexOf(a) - newTasks.indexOf(b));

            children.forEach(child => addWithChildren(child.id));
        };

        newTasks.forEach(task => addWithChildren(task.id));

        // Apply new sort orders 
        const updatedTasks = finalizedTasks.map((t, i) => ({ ...t, sort_order: i }));
        setOptimisticTasks(updatedTasks);
        setDraggedTaskId(null);

        // Sync to backend
        try {
            await api.put(`/tasks/${draggedTaskId}`, { sort_order: targetIndex });
            // In a real app we might batch update all changed sort_orders if a robust backend endpoint existed.
            // For now, the user modifies one, and we assume it's good enough to visually sort it, 
            // but wait, if we only update one `sort_order`, the other numbers won't shift in the DB.
            // Since we can only `PUT /api/v1/tasks/:id` one at a time right now, we will sequentially 
            // send PUT requests for *all* tasks whose index changed.
            const updates = updatedTasks.map(t => api.put(`/tasks/${t.id}`, { sort_order: t.sort_order }));
            await Promise.all(updates);
        } catch (err) {
            console.error('Failed to save sort order', err);
            // Revert on failure
            fetchTimeline();
        }
    };

    // Horizontal Dragging Handlers
    const handlePointerDown = (e: React.PointerEvent, taskId: number, mode: 'start' | 'end' | 'move') => {
        e.stopPropagation(); // Prevent Task Click

        dragInteractionRef.current.dragged = false;

        // Find current dimensions
        const task = tasks.find(t => t.id === taskId);
        if (!task) return;

        const startCol = getGridColumnStart(task.start_date || null);
        let duration = 1;
        const finalEndDate = task.due_date;
        if (task.start_date && finalEndDate) {
            const s = parseDate(task.start_date);
            const eDate = parseDate(finalEndDate);
            s.setHours(0, 0, 0, 0);
            eDate.setHours(0, 0, 0, 0);
            duration = Math.max(1, Math.round((eDate.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1);
        } else if (task.duration_days && task.duration_days > 0) {
            duration = task.duration_days;
        }

        // Explicit pointer capture so drag doesn't drop if mouse exits the 10px target div
        (e.target as HTMLElement).setPointerCapture(e.pointerId);

        setHorizontalDragState({
            taskId,
            mode,
            startX: e.clientX,
            originalStartCol: startCol,
            originalDuration: duration,
            pointerId: e.pointerId,
            target: e.target as HTMLElement
        });

        // Add global listeners temporarily
        window.addEventListener('pointermove', handlePointerMove as any);
        window.addEventListener('pointerup', handlePointerUp as any);
    };

    const handlePointerMove = (e: PointerEvent) => {
        setHorizontalDragState(prev => {
            if (!prev) return null;

            // Calculate pixel diff and approximate grid columns (40px per col)
            const diffX = e.clientX - prev.startX;
            const diffCols = Math.round(diffX / 40);

            if (Math.abs(diffX) > 5) {
                dragInteractionRef.current.dragged = true;
            }

            // Calculate new boundaries
            let newStartCol = prev.originalStartCol;
            let newDuration = prev.originalDuration;

            if (prev.mode === 'move') {
                newStartCol = Math.max(1, prev.originalStartCol + diffCols);
            } else if (prev.mode === 'start') {
                newStartCol = Math.max(1, prev.originalStartCol + diffCols);
                // Adjust duration to keep right edge fixed
                const rightEdgeCol = prev.originalStartCol + prev.originalDuration;
                newDuration = Math.max(1, rightEdgeCol - newStartCol);
            } else if (prev.mode === 'end') {
                newDuration = Math.max(1, prev.originalDuration + diffCols);
            }

            // Immediately apply to optimistic state for visual feedback
            setOptimisticTasks(currentTasks => currentTasks.map(t => {
                if (t.id === prev.taskId) {
                    return {
                        ...t,
                        // Store temporary numeric offsets in virtual fields or just immediately translate to dates
                        _tempStartCol: newStartCol,
                        _tempDuration: newDuration
                    };
                }
                return t;
            }));

            return prev;
        });
    };

    const handlePointerUp = async () => {
        window.removeEventListener('pointermove', handlePointerMove as any);
        window.removeEventListener('pointerup', handlePointerUp as any);

        if (dragInteractionRef.current.dragged) {
            dragInteractionRef.current.lastDragEnd = Date.now();
        }
        dragInteractionRef.current.dragged = false;

        draggedTaskRef.current = null;

        setHorizontalDragState(prev => {
            if (!prev) return null;

            try {
                if (prev.target.hasPointerCapture(prev.pointerId)) {
                    prev.target.releasePointerCapture(prev.pointerId);
                }
            } catch (err) { }

            setOptimisticTasks(currentTasks => {
                const updatedTasks = currentTasks.map(t => {
                    if (t.id === prev.taskId) {
                        const sCol = (t as any)._tempStartCol ?? prev.originalStartCol;
                        const dur = (t as any)._tempDuration ?? prev.originalDuration;

                        // Only trigger API if something actually changed
                        if (sCol === prev.originalStartCol && dur === prev.originalDuration) {
                            return t;
                        }

                        // Convert columns back to Date strings
                        const newStartDate = new Date(startDate);
                        newStartDate.setDate(newStartDate.getDate() + (sCol - 1));

                        const newEndDate = new Date(newStartDate);
                        newEndDate.setDate(newEndDate.getDate() + (dur - 1));

                        const startStr = newStartDate.toISOString().split('T')[0];
                        const endStr = newEndDate.toISOString().split('T')[0];

                        const modifiedTask = {
                            ...t,
                            start_date: startStr,
                            due_date: endStr,
                            duration_days: dur
                        };

                        // Cleanup temp vars
                        delete (modifiedTask as any)._tempStartCol;
                        delete (modifiedTask as any)._tempDuration;

                        draggedTaskRef.current = modifiedTask;
                        return modifiedTask;
                    }
                    return t;
                });
                return updatedTasks;
            });

            return null; // clear state
        });

        // Use setTimeout to wait for the synchronous state updater to set the ref
        setTimeout(async () => {
            const taskToSave = draggedTaskRef.current;
            if (taskToSave) {
                try {
                    await api.put(`/tasks/${taskToSave.id}`, {
                        start_date: taskToSave.start_date,
                        due_date: taskToSave.due_date,
                        duration_days: taskToSave.duration_days
                    });
                } catch (err) {
                    console.error('Failed to resize task', err);
                    fetchTimeline();
                }
            }
        }, 10);
    };

    return (
        <div className="p-6 bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col h-full">
            <div className="flex justify-between items-center mb-6 shrink-0">
                <h2 className="text-xl font-bold text-gray-900">Team Timeline: {project.title}</h2>
                <button
                    onClick={onAddTask}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm text-sm font-medium"
                >
                    <Plus className="w-4 h-4" />
                    New Task
                </button>
            </div>

            <div className="overflow-x-auto flex-1 h-full" ref={timelineGridRef}>
                <div
                    className="grid gap-y-2 relative"
                    style={{ gridTemplateColumns: `220px repeat(${totalDays}, 40px)`, minWidth: 'fit-content' }}
                >
                    {/* Header Row */}
                    <div className="font-semibold text-gray-600 sticky left-0 bg-white z-40 border-b pb-4 mb-2" style={{ gridColumn: '1' }}>WORKSTREAM</div>
                    {dates.map((d, i) => (
                        <div key={i} className={`text-[10px] font-medium text-center border-b pb-2 border-l z-20 transition-colors ${d.toDateString() === new Date().toDateString() ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'text-gray-400 border-gray-100'}`}>
                            <span className="block opacity-60 uppercase">{d.toLocaleString('default', { weekday: 'short' }).charAt(0)}</span>
                            <span className="text-xs">{d.getDate()}</span>
                        </div>
                    ))}

                    {/* Today Line */}
                    <div
                        className="absolute top-0 bottom-0 border-l-2 border-indigo-400 z-20 pointer-events-none opacity-50"
                        style={{ left: `calc(220px + ${(getGridColumnStart(new Date().toISOString().split('T')[0]) - 1) * 40}px)` }}
                    />

                    {/* Project Due Date Line */}
                    {project.due_date && (
                        <div
                            className="absolute top-10 bottom-0 border-l-2 border-red-500 z-10 pointer-events-none"
                            style={{ left: `calc(220px + ${(getGridColumnStart(project.due_date) - 1) * 40}px)` }}
                            title="Project Final Due Date"
                        >
                            <span className="text-[9px] font-bold absolute -top-5 -left-2 bg-white px-1 border border-red-200 text-red-600 rounded whitespace-nowrap">
                                Project Due Date
                            </span>
                        </div>
                    )}

                    {/* Milestones Vertical Lines */}
                    {milestones.map(m => {
                        const col = getGridColumnStart(m.due_date || null);
                        return (
                            <div
                                key={`milestone-${m.id}`}
                                className={`absolute top-10 bottom-0 border-l-2 z-20 pointer-events-none ${m.is_hard_deadline ? 'border-red-500' : 'border-blue-300 dashed'}`}
                                style={{ left: `calc(220px + ${(col - 1) * 40}px)` }}
                                title={m.title}
                            >
                                <span className={`text-[9px] font-bold absolute -top-5 -left-2 bg-white px-1 border rounded whitespace-nowrap ${m.is_hard_deadline ? 'text-red-600 border-red-200' : 'text-blue-600 border-blue-200'}`}>
                                    {m.title}
                                </span>
                            </div>
                        );
                    })}

                    {/* Task/Empty Rows */}
                    {tasks.length === 0 ? (
                        <>
                            <div className="sticky left-0 bg-white z-20 border-r p-2 italic text-gray-400 text-sm flex items-center" style={{ gridColumn: '1' }}>
                                No tasks yet...
                            </div>
                            <div className="relative h-10 border-b border-gray-50 border-dashed" style={{ gridColumn: '2 / -1' }}>
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <button onClick={onAddTask} className="text-xs text-indigo-500 hover:text-indigo-700 font-medium">
                                        + Add your first task
                                    </button>
                                </div>
                            </div>
                        </>
                    ) : (
                        tasks.map((task, index) => {
                            let startCol = getGridColumnStart(task.start_date || null);
                            let duration = 1;
                            const finalEndDate = task.due_date;
                            if (task.start_date && finalEndDate) {
                                const s = parseDate(task.start_date);
                                const e = parseDate(finalEndDate);
                                s.setHours(0, 0, 0, 0);
                                e.setHours(0, 0, 0, 0);
                                duration = Math.max(1, Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1);
                            } else if (task.duration_days && task.duration_days > 0) {
                                duration = task.duration_days;
                            }

                            // Override with drag state if currently dragging this task
                            if ((task as any)._tempStartCol !== undefined) {
                                startCol = (task as any)._tempStartCol;
                                duration = (task as any)._tempDuration;
                            }

                            const isOverdue = task.status !== 'done' && task.due_date && new Date(task.due_date) < new Date();
                            let overdueDuration = 0;

                            if (isOverdue && task.due_date) {
                                const dueDate = parseDate(task.due_date);
                                const today = new Date();
                                today.setHours(0, 0, 0, 0);
                                const diffTime = Math.abs(today.getTime() - dueDate.getTime());
                                const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
                                overdueDuration = diffDays;
                            }

                            const deps = getDependencies(task);

                            return (
                                <React.Fragment key={task.id}>
                                    <div
                                        className={`sticky left-0 bg-white z-40 border-r border-b p-2 cursor-grab active:cursor-grabbing flex items-center justify-between shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)] transition-colors ${draggedTaskId === task.id ? 'opacity-50 bg-indigo-50 border-indigo-200' :
                                            dragOverTaskId === task.id ? 'border-t-2 border-t-indigo-500 bg-gray-50' : 'border-gray-100 hover:bg-gray-50'
                                            }`}
                                        style={{ gridColumn: '1' }}
                                        title={task.title}
                                        draggable
                                        onDragStart={(e) => handleDragStart(e, task.id)}
                                        onDragOver={(e) => handleDragOver(e, task.id)}
                                        onDragLeave={handleDragLeave}
                                        onDrop={(e) => handleDrop(e, task.id)}
                                    >
                                        <div className="flex items-center gap-2 overflow-hidden mr-2 flex-grow" onClick={() => onTaskClick?.(task)}>
                                            <span className="text-gray-400 cursor-grab shrink-0">⋮⋮</span>
                                            <span className="truncate text-sm font-medium text-gray-700">{task.title}</span>
                                        </div>
                                        {isOverdue && <span title="Overdue" className="text-red-500 ml-1 text-xs font-bold shrink-0">⚠️</span>}
                                    </div>
                                    <div className="relative h-10 border-b border-gray-100 flex items-center" style={{ gridColumn: '2 / -1' }}>

                                        {/* Draw dependencies */}
                                        {deps.map(depId => {
                                            const depTaskIndex = tasks.findIndex(t => t.id === depId);
                                            if (depTaskIndex === -1) return null;
                                            const depTask = tasks[depTaskIndex];
                                            const depStartCol = getGridColumnStart(depTask.start_date || null);
                                            let depDuration = 1;
                                            const depFinalEndDate = depTask.due_date;
                                            if (depTask.start_date && depFinalEndDate) {
                                                const s = parseDate(depTask.start_date);
                                                const e = parseDate(depFinalEndDate);
                                                s.setHours(0, 0, 0, 0);
                                                e.setHours(0, 0, 0, 0);
                                                depDuration = Math.max(1, Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1);
                                            } else if (depTask.duration_days && depTask.duration_days > 0) {
                                                depDuration = depTask.duration_days;
                                            }

                                            const startX = (depStartCol - 1) * 40 + (depDuration * 40);
                                            const startY = 20 - (index - depTaskIndex) * ROW_PITCH;
                                            const endX = (startCol - 1) * 40;
                                            const endY = 20;

                                            return (
                                                <svg key={depId} className="absolute top-0 left-0 pointer-events-none overflow-visible z-0" style={{ width: 1, height: 1 }}>
                                                    <path
                                                        d={`M ${startX} ${startY} L ${startX + 10} ${startY} L ${startX + 10} ${endY} L ${endX} ${endY}`}
                                                        fill="none"
                                                        stroke="#94a3b8"
                                                        strokeWidth="1.5"
                                                        strokeDasharray="4 4"
                                                    />
                                                </svg>
                                            );
                                        })}

                                        <div
                                            className={`absolute h-6 rounded-md cursor-grab active:cursor-grabbing hover:brightness-110 shadow-sm flex items-center px-6 overflow-hidden z-10 
                                                ${horizontalDragState?.taskId === task.id ? 'opacity-80 scale-y-[1.1] shadow-lg transition-none' : 'transition-all'} 
                                                ${task.status === 'done' ? 'bg-emerald-500' :
                                                    (task.status as string === 'in_progress' || task.status as string === 'doing') ? 'bg-blue-500' :
                                                        (task.status as string) === 'review' ? 'bg-purple-500' :
                                                            task.is_blocked ? 'bg-rose-400' : 'bg-slate-400'} 
                                                ${task.deleted_at ? 'opacity-40 grayscale-[0.5]' : ''}`
                                            }
                                            style={{
                                                left: `calc(${(startCol - 1) * 40}px)`,
                                                width: `calc(${duration * 40}px)`,
                                                minWidth: '20px'
                                            }}
                                            onPointerDown={(e) => handlePointerDown(e, task.id, 'move')}
                                            onClick={(e) => {
                                                if (Date.now() - dragInteractionRef.current.lastDragEnd < 250) {
                                                    e.stopPropagation(); // Don't open if just ending a drag
                                                } else {
                                                    onTaskClick?.(task);
                                                }
                                            }}
                                        >
                                            {/* Left Edge Resizer */}
                                            <div
                                                className="absolute left-0 top-0 bottom-0 w-3 cursor-ew-resize hover:bg-black/10 transition-colors z-20 group"
                                                onPointerDown={(e) => handlePointerDown(e, task.id, 'start')}
                                            >
                                                <div className="w-0.5 h-3 bg-white/50 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded opacity-0 group-hover:opacity-100 transition-opacity" />
                                            </div>

                                            {duration > 1 && <span className="text-[9px] text-white font-bold uppercase truncate pointer-events-none">{(task.status as string === 'doing' ? 'in_progress' : task.status).replace('_', ' ')}{task.deleted_at ? ' (Archived)' : ''}</span>}

                                            {/* Right Edge Resizer */}
                                            <div
                                                className="absolute right-0 top-0 bottom-0 w-3 cursor-ew-resize hover:bg-black/10 transition-colors z-20 group"
                                                onPointerDown={(e) => handlePointerDown(e, task.id, 'end')}
                                            >
                                                <div className="w-0.5 h-3 bg-white/50 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded opacity-0 group-hover:opacity-100 transition-opacity" />
                                            </div>
                                        </div>

                                        {isOverdue && overdueDuration > 0 && (
                                            <div
                                                className="absolute h-4 bg-red-100 border border-red-200 rounded-r-md cursor-pointer opacity-60 z-0"
                                                style={{
                                                    left: `calc(${(getGridColumnStart(task.due_date) - 1) * 40}px)`,
                                                    width: `calc(${overdueDuration * 40}px)`
                                                }}
                                                title={`Overdue by ${overdueDuration} days`}
                                            />
                                        )}
                                    </div>
                                </React.Fragment>
                            );
                        })
                    )}
                </div>
            </div>

            <div className="mt-4 flex gap-4 text-sm flex-wrap">
                <div className="flex items-center gap-1"><div className="w-4 h-4 bg-slate-400 rounded"></div> To Do</div>
                <div className="flex items-center gap-1"><div className="w-4 h-4 bg-blue-500 rounded"></div> In Progress</div>
                <div className="flex items-center gap-1"><div className="w-4 h-4 bg-purple-500 rounded"></div> Review</div>
                <div className="flex items-center gap-1"><div className="w-4 h-4 bg-emerald-500 rounded"></div> Done</div>
                <div className="flex items-center gap-1"><div className="w-4 h-4 bg-rose-400 rounded"></div> Blocked</div>
                <div className="flex items-center gap-1"><div className="w-0.5 h-4 bg-red-500"></div> Hard Deadline / Project Due</div>
                <div className="flex items-center gap-1"><div className="w-0.5 h-4 bg-blue-300 border-l border-dashed"></div> Milestone</div>
                <div className="flex items-center gap-1"><div className="w-4 h-0.5 bg-gray-400 border-t border-dashed"></div> Dependency</div>
            </div>
        </div>
    );
};

export default TimelineView;
