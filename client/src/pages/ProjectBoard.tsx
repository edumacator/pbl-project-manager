import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { api } from '../api/client';
import { Task, Project, Team, User } from '../types';
import { Plus, Pencil, Trash2, Calendar, Users, ChevronDown, ChevronRight, ExternalLink, UserPlus, UserCheck, Archive, BarChart } from 'lucide-react';
import { CreateTaskModal } from '../components/CreateTaskModal';
import { TeamMembersModal } from '../components/TeamMembersModal';
import { CritiqueModal } from '../components/CritiqueModal';
import PeerAssignmentModal from '../components/PeerAssignmentModal';
import TimelineView from '../components/TimelineView';
import { TaskDetailsModal } from '../components/TaskDetailsModal';
import { TeamContributionsModal } from '../components/TeamContributionsModal';
import { useToast } from '../contexts/ToastContext';

const KanbanColumn: React.FC<{
    title: string;
    status: string;
    tasks: Task[];
    onAdd: () => void;
    onDrop: (taskId: number, status: string) => void;
    onArchive?: (taskId: number) => void;
    onRestore?: (taskId: number) => void;
    onTaskClick?: (task: Task) => void;
}> = ({ title, status, tasks, onAdd, onDrop, onArchive, onRestore, onTaskClick }) => {

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        const taskId = Number(e.dataTransfer.getData("taskId"));
        if (taskId) {
            onDrop(taskId, status);
        }
    };

    return (
        <div
            className="bg-gray-100 p-4 rounded-xl min-w-[300px]"
            onDragOver={handleDragOver}
            onDrop={handleDrop}
        >
            <h3 className="font-semibold text-gray-700 mb-4 flex items-center justify-between">
                {title}
                <span className="bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full text-xs">{tasks.length}</span>
            </h3>
            <div className="space-y-3">
                {tasks.map(task => (
                    <div
                        key={task.id}
                        draggable
                        onDragStart={(e) => e.dataTransfer.setData("taskId", task.id.toString())}
                        onClick={() => onTaskClick?.(task)}
                        className={`bg-white p-4 rounded-lg shadow-sm border border-gray-200 cursor-move hover:shadow-md transition-shadow ${!task.is_completable && status !== 'done' ? 'border-l-4 border-l-amber-400' : ''}`}
                        title={!task.is_completable ? "Critique Required before Done" : ""}
                    >
                        <div className="font-medium text-gray-900 mb-1 flex justify-between">
                            {task.title}
                            {!task.is_completable && (
                                <span className="text-[10px] bg-amber-100 text-amber-700 px-1 rounded h-fit">Critique Req.</span>
                            )}
                        </div>
                        {task.description && <div className="text-gray-500 text-xs mb-3 line-clamp-2">{task.description}</div>}

                        <div className="flex items-center justify-between text-xs text-gray-400 mt-2">
                            <div className="flex items-center gap-2">
                                <span>#{task.id}</span>
                                {task.due_date && (
                                    <span className="flex items-center gap-1 text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded">
                                        <Calendar className="w-3 h-3" />
                                        {new Date(task.due_date).toLocaleDateString()}
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center gap-1">
                                {task.deleted_at ? (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onRestore?.(task.id); }}
                                        className="p-1 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                                        title="Restore Task"
                                    >
                                        <Plus className="w-3.5 h-3.5" />
                                    </button>
                                ) : (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onArchive?.(task.id); }}
                                        className="p-1 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                        title="Archive Task"
                                    >
                                        <Archive className="w-3.5 h-3.5" />
                                    </button>
                                )}
                                {task.assignee_id && (
                                    <div className="w-6 h-6 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center font-bold text-[10px]" title={`User ${task.assignee_id}`}>
                                        U{task.assignee_id}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
                <button
                    onClick={onAdd}
                    className="w-full py-2 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-lg text-sm dashed border border-transparent hover:border-gray-300 flex items-center justify-center transition-colors"
                >
                    <Plus className="w-4 h-4 mr-1" /> Add Task
                </button>
            </div>
        </div>
    );
};

const ProjectBoard: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [project, setProject] = useState<Project | null>(null);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [teams, setTeams] = useState<any[]>([]);
    const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);
    const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
    const [isTeamMembersOpen, setIsTeamMembersOpen] = useState(false);
    const [classStudents, setClassStudents] = useState<User[]>([]);
    const [viewMode, setViewMode] = useState<'board' | 'timeline' | 'resources'>('board');
    const [expandedTeamIds, setExpandedTeamIds] = useState<Set<number>>(new Set());
    const [showArchived, setShowArchived] = useState(false);
    const [projectResources, setProjectResources] = useState<any[]>([]);
    const [timelineRefresh, setTimelineRefresh] = useState(0);
    const [isContributionsOpen, setIsContributionsOpen] = useState(false);
    const { addToast } = useToast();

    // Critique Modal State
    const [isCritiqueModalOpen, setIsCritiqueModalOpen] = useState(false);
    const [critiqueTask, setCritiqueTask] = useState<Task | null>(null);

    // Task Details Modal State
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);

    // Peer Assignment Modal State
    const [isAssignmentModalOpen, setIsAssignmentModalOpen] = useState(false);

    const toggleTeamExpand = (teamId: number) => {
        const newSet = new Set(expandedTeamIds);
        if (newSet.has(teamId)) {
            newSet.delete(teamId);
        } else {
            newSet.add(teamId);
        }
        setExpandedTeamIds(newSet);
    };

    const handleEditProject = () => {
        navigate(`/projects/${id}/edit`);
    };

    const handleDeleteProject = async () => {
        if (!window.confirm('Are you sure you want to delete this project? This cannot be undone.')) return;
        try {
            await api.delete(`/projects/${id}`);
            window.dispatchEvent(new CustomEvent('projects-changed'));
            addToast('Project deleted successfully', 'success');
            navigate('/teacher/dashboard');
        } catch (error) {
            console.error('Failed to delete project:', error);
            addToast('Failed to delete project', 'error');
        }
    };

    const handleTaskCreated = () => {
        fetchTasks(selectedTeamId);
        setTimelineRefresh(prev => prev + 1);
    };

    const handleTaskArchived = async (taskId: number) => {
        if (!window.confirm('Archive this task? You can still view it in the Archived view.')) return;
        try {
            await api.delete(`/tasks/${taskId}`);
            fetchTasks(selectedTeamId);
            addToast('Task archived', 'success');
        } catch (e) {
            console.error(e);
            addToast("Failed to archive task", 'error');
        }
    };

    const handleTaskRestore = async (taskId: number) => {
        try {
            await api.post(`/tasks/${taskId}/restore`, {});
            fetchTasks(selectedTeamId);
            addToast('Task restored', 'success');
        } catch (e) {
            console.error(e);
            addToast("Failed to restore task", 'error');
        }
    };

    useEffect(() => {
        if (!id) return;
        setLoading(true);

        const fetchData = async () => {
            try {
                const projRes = await api.get<{ project: Project }>(`/projects/${id}`);
                setProject(projRes.project);

                const teamRes = await api.get<any[]>(`/projects/${id}/teams`);
                setTeams(teamRes || []);

                try {
                    const resData = await api.get<any[]>(`/projects/${id}/resources`);
                    setProjectResources(resData || []);
                } catch (e) {
                    console.error("Failed to fetch project resources", e);
                }

                fetchTasks(null);

                if (projRes.project.class_id) {
                    try {
                        const classId = Number(projRes.project.class_id);
                        const classRes = await api.get<any>(`/classes/${classId}`);
                        if (classRes && Array.isArray(classRes.students)) {
                            setClassStudents(classRes.students);
                        }
                    } catch (e) {
                        console.error("Failed to fetch class students", e);
                    }
                }

            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [id]);

    const [searchParams, setSearchParams] = useSearchParams();
    const teamIdParam = searchParams.get('team_id');

    useEffect(() => {
        if (teamIdParam) {
            const tid = Number(teamIdParam);
            setSelectedTeamId(tid);
            fetchTasks(tid);
        } else {
            setSelectedTeamId(null);
            fetchTasks(null);
        }
    }, [teamIdParam]);

    useEffect(() => {
        if (!project) {
            document.title = "Project Workspace | PBL Manager";
            return;
        }

        let title = project.title;
        if (selectedTeamId) {
            const team = teams.find(t => t.id === selectedTeamId);
            if (team) {
                title += ` - ${team.name}`;
            }
            const viewName = viewMode === 'board' ? 'Board' : (viewMode === 'timeline' ? 'Timeline' : 'Resources');
            title += ` - ${viewName}`;
        } else {
            title += " - Teacher View";
        }
        document.title = `${title} | PBL Manager`;
    }, [project, selectedTeamId, teams, viewMode]);

    const fetchTasks = async (teamId: number | null) => {
        let url = teamId
            ? `/projects/${id}/tasks?team_id=${teamId}`
            : `/projects/${id}/tasks`;

        if (showArchived) {
            url += (url.includes('?') ? '&' : '?') + 'include_deleted=true';
        }

        try {
            const data = await api.get<Task[]>(url);
            setTasks(data);
        } catch (e) { console.error(e); }
    };

    useEffect(() => {
        fetchTasks(selectedTeamId);
    }, [showArchived]);

    const handleTeamChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const tid = e.target.value ? Number(e.target.value) : null;
        if (tid) {
            setSearchParams({ team_id: tid.toString() });
        } else {
            setSearchParams({});
        }
    };

    const handleCreateTeam = async (classId: number) => {
        const name = prompt("Enter team name:");
        if (!name) return;
        try {
            await api.post(`/projects/${id}/teams`, { name, class_id: classId });
            // Refresh teams
            const teamRes = await api.get<any[]>(`/projects/${id}/teams`);
            setTeams(teamRes || []);
            addToast('Team created', 'success');
        } catch (e) {
            addToast("Failed to create team", 'error');
        }
    };

    // --- Drag and Drop & Status Logic ---

    const updateTaskStatus = async (taskId: number, newStatus: string) => {
        // Optimistic update
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus as any } : t));

        try {
            await api.put<Task>(`/tasks/${taskId}`, { status: newStatus });
        } catch (error) {
            console.error("Failed to update task status", error);
            // Revert
            fetchTasks(selectedTeamId);
            addToast("Failed to move task.", 'error');
        }
    };

    const handleTaskDrop = (taskId: number, newStatus: string) => {
        const task = tasks.find(t => t.id === taskId);
        if (!task || task.status === newStatus) return;

        // Gatekeeper Logic
        if (newStatus === 'done') {
            if (task.is_completable === false) {
                // Block and Open Critique Modal
                setCritiqueTask(task);
                setIsCritiqueModalOpen(true);
                return;
            }
        }

        updateTaskStatus(taskId, newStatus);
    };

    const handleCritiqueSubmit = async (warm: string, cool: string, requiresRevision: boolean) => {
        if (!critiqueTask) return;
        try {
            await api.submitFeedback(critiqueTask.id, {
                warm_feedback: warm,
                cool_feedback: cool,
                requires_revision: requiresRevision
            });

            if (!requiresRevision) {
                updateTaskStatus(critiqueTask.id, 'done');
                setTasks(prev => prev.map(t => t.id === critiqueTask.id ? { ...t, is_completable: true } : t));
            } else {
                setTasks(prev => prev.map(t => t.id === critiqueTask.id ? { ...t, status: 'in_progress', is_completable: false } : t));
            }

            addToast(requiresRevision ? "Feedback submitted. Revision requested." : "Feedback submitted. Task completed!", 'success');

        } catch (e) {
            console.error("Critique submission failed", e);
            addToast("Failed to submit critique.", 'error');
        }
    };


    const todo = tasks.filter(t => t.status === 'todo');
    const doing = tasks.filter(t => (t.status as string) === 'doing' || (t.status as string) === 'in_progress');
    const done = tasks.filter(t => t.status === 'done');

    const selectedTeam = teams.find(t => t.id === selectedTeamId);
    const availableAssignees = selectedTeam ? selectedTeam.members : [];

    if (loading) return <div>Loading Board...</div>;

    const groupedTeams = (project?.classes || []).map(cls => {
        const classTeams = teams.filter(t => t.class_id === cls.id);
        return [cls.name, classTeams, cls.id] as [string, Team[], number];
    }).sort(([a], [b]) => a.localeCompare(b));

    return (
        <div className="h-full flex flex-col">
            <div className="mb-6 flex justify-between items-start">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">
                        {project ? project.title : `Project Workspace ${id}`}
                        {selectedTeamId && teams.find(t => t.id === selectedTeamId) && (
                            <span className="text-gray-500 font-normal">
                                {' / '}{teams.find(t => t.id === selectedTeamId)?.name}
                            </span>
                        )}
                    </h1>
                    <p className="text-gray-500">Driving Question: {project ? project.driving_question : 'Loading...'}</p>
                    <div className="flex flex-wrap gap-2 mt-2">
                        {project?.classes?.map(c => (
                            <Link
                                key={c.id}
                                to={`/classes/${c.id}`}
                                className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 hover:bg-blue-200"
                            >
                                {c.name}
                            </Link>
                        ))}
                    </div>
                </div>
                <div className="flex gap-4 items-center">
                    {selectedTeamId && (
                        <div className="flex items-center bg-gray-100 p-1 rounded-lg">
                            <button onClick={() => setViewMode('board')} className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${viewMode === 'board' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>Board</button>
                            <button onClick={() => setViewMode('timeline')} className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${viewMode === 'timeline' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>Timeline</button>
                            <button onClick={() => setViewMode('resources')} className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${viewMode === 'resources' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>Resources</button>
                        </div>
                    )}
                    <div className="flex items-center">
                        <label className="mr-2 text-sm font-medium text-gray-700">Group:</label>
                        <select
                            value={selectedTeamId || ''}
                            onChange={handleTeamChange}
                            className="bg-white border border-gray-300 rounded-md text-sm px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                            <option value="">All / Teacher View</option>
                            {teams.map(t => (
                                <option key={t.id} value={t.id}>{t.class_name ? `${t.class_name} - ${t.name}` : t.name}</option>
                            ))}
                        </select>
                    </div>

                    <button
                        onClick={() => setIsAssignmentModalOpen(true)}
                        className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors border border-transparent hover:border-indigo-200"
                        title="Manage Peer Assignments"
                    >
                        <UserCheck className="w-5 h-5" />
                        <span className="sr-only">Assignments</span>
                    </button>

                    {selectedTeamId && (
                        <>
                            <button
                                onClick={() => setIsContributionsOpen(true)}
                                className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors border border-transparent hover:border-indigo-200"
                                title="Team Contributions Analytics"
                            >
                                <BarChart className="w-5 h-5" />
                            </button>
                            <button
                                onClick={() => setIsTeamMembersOpen(true)}
                                className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors border border-transparent hover:border-indigo-200"
                                title="Manage Team Members"
                            >
                                <UserPlus className="w-5 h-5" />
                            </button>
                        </>
                    )}
                    <div className="flex gap-2 border-l pl-4 border-gray-200">
                        <button
                            onClick={() => setShowArchived(!showArchived)}
                            className={`p-2 rounded-full transition-colors ${showArchived ? 'bg-amber-100 text-amber-600' : 'text-gray-400 hover:text-indigo-600 hover:bg-gray-100'}`}
                            title={showArchived ? "Hide Archived" : "Show Archived"}
                        >
                            <Archive className="w-5 h-5" />
                        </button>
                        <button onClick={handleEditProject} className="p-2 text-gray-400 hover:text-indigo-600 rounded-full hover:bg-gray-100 transition-colors" title="Edit Project"><Pencil className="w-5 h-5" /></button>
                        <button onClick={handleDeleteProject} className="p-2 text-gray-400 hover:text-red-600 rounded-full hover:bg-gray-100 transition-colors" title="Delete Project"><Trash2 className="w-5 h-5" /></button>
                    </div>
                </div>
            </div>

            {project && (
                <>
                    <PeerAssignmentModal
                        isOpen={isAssignmentModalOpen}
                        onClose={() => setIsAssignmentModalOpen(false)}
                        projectId={Number(id)}
                    />
                    <CreateTaskModal
                        project={project}
                        existingTasks={tasks}
                        isOpen={isCreateTaskOpen}
                        onClose={() => { setIsCreateTaskOpen(false); setTaskToEdit(null); }}
                        onTaskCreated={handleTaskCreated}
                        defaultTeamId={selectedTeamId}
                        availableMembers={availableAssignees}
                        teams={teams}
                        taskToEdit={taskToEdit}
                    />
                    <TaskDetailsModal
                        isOpen={!!selectedTask}
                        onClose={() => setSelectedTask(null)}
                        task={selectedTask}
                        project={project}
                        onEditTask={(t) => {
                            setSelectedTask(null);
                            setTaskToEdit(t);
                            setIsCreateTaskOpen(true);
                        }}
                    />
                    {selectedTeam && (
                        <TeamMembersModal
                            isOpen={isTeamMembersOpen}
                            onClose={() => setIsTeamMembersOpen(false)}
                            team={selectedTeam}
                            classStudents={classStudents}
                            onTeamUpdated={(updatedTeam) => {
                                setTeams(prev => prev.map(t => t.id === updatedTeam.id ? updatedTeam : t));
                            }}
                        />
                    )}
                    {critiqueTask && (
                        <CritiqueModal
                            isOpen={isCritiqueModalOpen}
                            onClose={() => setIsCritiqueModalOpen(false)}
                            onSubmit={handleCritiqueSubmit}
                            taskTitle={critiqueTask.title}
                        />
                    )}
                </>
            )}

            <div className="flex-1 overflow-x-auto">
                {selectedTeamId ? (
                    viewMode === 'board' ? (
                        <div className="flex gap-6 h-full pb-4">
                            <KanbanColumn
                                title="To Do"
                                status="todo"
                                tasks={todo}
                                onAdd={() => { setTaskToEdit(null); setIsCreateTaskOpen(true); }}
                                onDrop={handleTaskDrop}
                                onArchive={handleTaskArchived}
                                onRestore={handleTaskRestore}
                                onTaskClick={(task) => setSelectedTask(task)}
                            />
                            <KanbanColumn
                                title="In Progress"
                                status="in_progress"
                                tasks={doing}
                                onAdd={() => { setTaskToEdit(null); setIsCreateTaskOpen(true); }}
                                onDrop={handleTaskDrop}
                                onArchive={handleTaskArchived}
                                onRestore={handleTaskRestore}
                                onTaskClick={(task) => setSelectedTask(task)}
                            />
                            <KanbanColumn
                                title="Done"
                                status="done"
                                tasks={done}
                                onAdd={() => { setTaskToEdit(null); setIsCreateTaskOpen(true); }}
                                onDrop={handleTaskDrop}
                                onArchive={handleTaskArchived}
                                onRestore={handleTaskRestore}
                                onTaskClick={(task) => setSelectedTask(task)}
                            />
                        </div>
                    ) : viewMode === 'timeline' ? (
                        <TimelineView
                            teamId={selectedTeamId}
                            projectProp={project || undefined}
                            onAddTask={() => { setTaskToEdit(null); setIsCreateTaskOpen(true); }}
                            showArchived={showArchived}
                            onTaskClick={(task) => setSelectedTask(task)}
                            refreshTrigger={timelineRefresh}
                        />
                    ) : (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex-1 overflow-y-auto">
                            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">Project Library</h2>
                            {projectResources.length === 0 ? (
                                <div className="text-gray-400 italic py-8 text-center border-2 border-dashed border-gray-100 rounded-xl">No resources attached to this project or its tasks yet.</div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {projectResources.map(res => {
                                        const team = res.team_id ? teams.find(t => t.id === res.team_id) : null;
                                        const relatedTask = res.task_id ? tasks.find((t: any) => t.id === res.task_id) : null;
                                        return (
                                            <div key={res.id} className="p-4 bg-gray-50 hover:bg-white border hover:border-indigo-200 border-gray-100 rounded-lg shadow-sm transition-all group">
                                                <div className="flex justify-between items-start mb-2">
                                                    <h3 className="font-semibold text-gray-900 line-clamp-1 flex-1 pr-2" title={res.title}>{res.title}</h3>
                                                    <a href={res.url} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-indigo-600 transition-colors bg-white p-1 rounded shadow-sm border border-gray-100">
                                                        <ExternalLink className="w-3.5 h-3.5" />
                                                    </a>
                                                </div>
                                                <div className="text-xs text-gray-500 mb-3 break-all line-clamp-1 flex items-center gap-1" title={res.url}>
                                                    <div className="px-1.5 py-0.5 rounded bg-gray-200 text-gray-700 font-medium uppercase text-[10px] tracking-wide inline-block">{res.type}</div>
                                                    {res.url}
                                                </div>
                                                {team && (
                                                    <div className="mt-auto pt-3 border-t border-gray-200/60">
                                                        <div className="text-xs text-emerald-700 font-medium flex items-center">
                                                            Team: {team.name}
                                                        </div>
                                                    </div>
                                                )}
                                                {relatedTask && (
                                                    <div className={team ? "mt-1" : "mt-auto pt-3 border-t border-gray-200/60"}>
                                                        <div className="text-xs text-indigo-600 font-medium flex items-center cursor-pointer hover:underline" onClick={() => setSelectedTask(relatedTask)}>
                                                            Attached to: {relatedTask.title}
                                                        </div>
                                                    </div>
                                                )}
                                                {!relatedTask && res.task_id && (
                                                    <div className={team ? "mt-1" : "mt-auto pt-3 border-t border-gray-200/60"}>
                                                        <div className="text-[10px] text-gray-400">Attached to Task #{res.task_id}</div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )
                ) : (
                    <div className="h-full overflow-y-auto space-y-8 pr-4">
                        {groupedTeams.map(([className, classTeams, classId]: [string, Team[], number]) => (
                            <div key={classId} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                                <div className="flex justify-between items-center mb-4 sticky top-0 bg-white z-10">
                                    <h2 className="text-lg font-bold text-gray-800">{className}</h2>
                                    <button
                                        onClick={() => handleCreateTeam(classId)}
                                        className="text-xs flex items-center text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-2 py-1 rounded-md transition-colors"
                                    >
                                        <Plus className="w-3 h-3 mr-1" /> New Team
                                    </button>
                                </div>
                                <div className="space-y-6">
                                    {classTeams.length === 0 ? (
                                        <div className="text-center py-8 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                                            <p className="text-sm text-gray-400 italic mb-2">No teams created for this class yet.</p>
                                            <button
                                                onClick={() => handleCreateTeam(classId)}
                                                className="text-xs text-indigo-600 hover:underline"
                                            >
                                                Create the first team
                                            </button>
                                        </div>
                                    ) : (
                                        classTeams.sort((a: Team, b: Team) => a.name.localeCompare(b.name)).map((team: Team) => {
                                            const teamTasks = tasks.filter(t => t.team_id === team.id);
                                            const teamTodo = teamTasks.filter(t => t.status === 'todo');
                                            const teamDoing = teamTasks.filter(t => (t.status as string) === 'doing' || (t.status as string) === 'in_progress');
                                            const teamDone = teamTasks.filter(t => t.status === 'done');

                                            return (
                                                <div key={team.id} className="border-t border-gray-100 pt-4 first:border-0 first:pt-0">
                                                    <div className="flex items-center justify-between mb-3 bg-gray-50 p-2 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer" onClick={() => toggleTeamExpand(team.id)}>
                                                        <div className="flex items-center gap-2">
                                                            <button className="text-gray-400 hover:text-gray-600 focus:outline-none" onClick={(e) => { e.stopPropagation(); toggleTeamExpand(team.id); }}>
                                                                {expandedTeamIds.has(team.id) ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                                            </button>
                                                            <h3 className="font-semibold text-gray-700">{team.name}</h3>
                                                            <span className="text-xs text-gray-400 font-normal">({teamTasks.length} tasks)</span>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <button onClick={(e) => { e.stopPropagation(); setSearchParams({ team_id: team.id.toString() }); }} className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-md flex items-center gap-1 text-sm font-medium transition-colors" title="Go to Board">
                                                                <span>Open Board</span><ExternalLink className="w-3.5 h-3.5" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                    {expandedTeamIds.has(team.id) && (
                                                        <div className="pl-8 pb-4 animate-in fade-in slide-in-from-top-2 duration-200">
                                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                                <div className="bg-gray-50 rounded p-3 text-xs border border-gray-100">
                                                                    <span className="font-semibold text-gray-500 mb-2 block uppercase tracking-wider text-[10px]">To Do ({teamTodo.length})</span>
                                                                    <div className="space-y-2">
                                                                        {teamTodo.map(t => <div key={t.id} className="bg-white p-2 border rounded shadow-sm truncate border-l-4 border-l-gray-300">{t.title}</div>)}
                                                                    </div>
                                                                </div>
                                                                <div className="bg-blue-50/50 rounded p-3 text-xs border border-blue-100">
                                                                    <span className="font-semibold text-blue-600 mb-2 block uppercase tracking-wider text-[10px]">In Progress ({teamDoing.length})</span>
                                                                    <div className="space-y-2">
                                                                        {teamDoing.map(t => <div key={t.id} className="bg-white p-2 border rounded shadow-sm truncate border-l-4 border-l-blue-400">{t.title}</div>)}
                                                                    </div>
                                                                </div>
                                                                <div className="bg-green-50/50 rounded p-3 text-xs border border-green-100">
                                                                    <span className="font-semibold text-green-600 mb-2 block uppercase tracking-wider text-[10px]">Done ({teamDone.length})</span>
                                                                    <div className="space-y-2">
                                                                        {teamDone.map(t => <div key={t.id} className="bg-white p-2 border rounded shadow-sm truncate border-l-4 border-l-green-400">{t.title}</div>)}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </div>
                        ))}
                        {groupedTeams.length === 0 && (
                            <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                                <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                                <h3 className="text-lg font-medium text-gray-900">No Classes Assigned</h3>
                                <p className="text-gray-500 max-w-xs mx-auto mt-1">Assign this project to a class to start building teams and managing tasks.</p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {isContributionsOpen && selectedTeamId && (
                <TeamContributionsModal
                    teamId={selectedTeamId}
                    teamName={teams.find(t => t.id === selectedTeamId)?.name || ''}
                    isOpen={isContributionsOpen}
                    onClose={() => setIsContributionsOpen(false)}
                />
            )}
        </div>
    );
};

export default ProjectBoard;
