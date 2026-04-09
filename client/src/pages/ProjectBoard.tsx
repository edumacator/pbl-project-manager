import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { api } from '../api/client';
import { Task, Project, User } from '../types';
import { 
    Plus, Trash2, Calendar, Users, 
    ExternalLink, ArrowLeft, BarChart, Clock,
    Layout as LayoutIcon, Library, Settings, AlertTriangle,
    Paperclip, UserPlus
} from 'lucide-react';
import { CreateTaskModal } from '../components/CreateTaskModal';
import { TeamMembersModal } from '../components/TeamMembersModal';
import { CritiqueModal } from '../components/CritiqueModal';
import PeerAssignmentModal from '../components/PeerAssignmentModal';
import TimelineView from '../components/TimelineView';
import { TaskDetailsModal } from '../components/TaskDetailsModal';
import { TeamContributionsModal } from '../components/TeamContributionsModal';
import { ProjectHomeView } from '../components/ProjectHomeView';
import CalendarView from '../components/CalendarView';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';

const getInitials = (name?: string) => {
    if (!name) return '';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 0) return '';
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
};

const KanbanColumn: React.FC<{
    title: string;
    status: string;
    tasks: Task[];
    onAdd: () => void;
    onDrop: (taskId: number, status: string) => void;
    onTaskClick?: (task: Task) => void;
}> = ({ title, status, tasks, onAdd, onDrop, onTaskClick }) => {

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
            className="flex-shrink-0 w-[300px] sm:w-[320px] bg-gray-100 rounded-xl flex flex-col h-[calc(100vh-280px)] min-h-[400px] snap-center"
            onDragOver={handleDragOver}
            onDrop={handleDrop}
        >
            <div className="p-4 flex items-center justify-between sticky top-0 bg-gray-100 rounded-t-xl z-20">
                <h3 className="font-bold text-gray-700 flex items-center gap-2">
                    {title}
                    <span className="bg-gray-200 text-gray-600 px-2.5 py-0.5 rounded-full text-xs font-bold">{tasks.length}</span>
                </h3>
                <button 
                    onClick={onAdd}
                    className="p-1 hover:bg-gray-200 rounded-md transition-colors text-gray-500"
                >
                    <Plus className="w-4 h-4" />
                </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
                {tasks.map(task => (
                    <div
                        key={task.id}
                        draggable
                        onDragStart={(e) => e.dataTransfer.setData("taskId", task.id.toString())}
                        onClick={() => onTaskClick?.(task)}
                        className={`bg-white p-4 rounded-lg shadow-sm border ${task.is_stuck ? 'border-amber-400 bg-amber-50/30' : 'border-gray-200'} cursor-move hover:shadow-md transition-shadow group relative`}
                    >
                        <div className="font-medium text-gray-900 mb-2 leading-snug pr-4">
                            {task.title}
                        </div>
                        

                        {/* Subtask Progress */}
                        {task.subtask_count !== undefined && task.subtask_count > 0 && (
                            <div className="mb-3">
                                <div className="flex justify-between text-[10px] font-semibold text-gray-500 mb-1">
                                    <span>SUBTASKS</span>
                                    <span>{task.completed_subtask_count || 0}/{task.subtask_count}</span>
                                </div>
                                <div className="w-full bg-gray-100 h-1 rounded-full overflow-hidden">
                                    <div 
                                        className="bg-indigo-500 h-full transition-all duration-300"
                                        style={{ width: `${((task.completed_subtask_count || 0) / task.subtask_count) * 100}%` }}
                                    />
                                </div>
                            </div>
                        )}

                        <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-50">
                            <div className="flex items-center gap-2">
                                <div className="flex -space-x-1 overflow-hidden">
                                    {task.assignee_id && (
                                        <div 
                                            className="inline-block h-6 w-6 rounded-full ring-2 ring-white bg-indigo-100 flex items-center justify-center text-[10px] font-bold text-indigo-700"
                                            title={task.assignee_name}
                                        >
                                            {getInitials(task.assignee_name)}
                                        </div>
                                    )}
                                </div>
                                {task.priority && (
                                    <span className={`text-[8px] font-black px-1 rounded border uppercase tracking-tighter ${
                                        task.priority === 'P1' ? 'bg-red-50 text-red-600 border-red-100' :
                                        task.priority === 'P2' ? 'bg-orange-50 text-orange-600 border-orange-100' :
                                        'bg-gray-50 text-gray-400 border-gray-100'
                                    }`}>
                                        {task.priority}
                                    </span>
                                )}
                                {((task.resource_count ?? 0) > 0) ? (
                                    <div title={`${task.resource_count} resources attached`}>
                                        <Paperclip className="w-3 h-3 text-indigo-400" />
                                    </div>
                                ) : null}
                                {task.is_stuck && (
                                    <div title="Team is stuck">
                                        <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                                    </div>
                                )}
                            </div>
                            {task.due_date && (
                                <div className={`text-[10px] flex items-center gap-1 font-bold italic ${
                                    task.status !== 'done' && new Date(task.due_date) < new Date() ? 'text-red-500' : 'text-gray-400'
                                }`}>
                                    <Clock className="w-3 h-3" />
                                    {new Date(task.due_date).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                    {task.status !== 'done' && new Date(task.due_date) < new Date() && (
                                        <div title="Overdue">
                                            <span className="ml-0.5 w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const ProjectBoard: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { addToast } = useToast();
    const { user } = useAuth();
    const [searchParams, setSearchParams] = useSearchParams();

    const [project, setProject] = useState<Project | null>(null);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [teams, setTeams] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState<'home' | 'board' | 'timeline' | 'calendar' | 'resources'>('home');
    const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);
    
    // UI Modal State
    const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
    const [isTeamMembersOpen, setIsTeamMembersOpen] = useState(false);
    const [isContributionsOpen, setIsContributionsOpen] = useState(false);
    const [isAssignmentModalOpen, setIsAssignmentModalOpen] = useState(false);
    const [isCritiqueModalOpen, setIsCritiqueModalOpen] = useState(false);
    
    // Data/Selection State
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const isStaff = user?.role === 'teacher' || user?.role === 'admin';
    const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);
    const [critiqueTask, setCritiqueTask] = useState<Task | null>(null);
    const [classStudents, setClassStudents] = useState<User[]>([]);
    const [projectResources, setProjectResources] = useState<any[]>([]);
    const [timelineRefresh, setTimelineRefresh] = useState(0);

    // Filters
    const [priorityFilter, setPriorityFilter] = useState<string>('');
    const [assigneeFilter, setAssigneeFilter] = useState<string>('');
    const [showArchived, setShowArchived] = useState(false);

    const teamIdParam = searchParams.get('team_id');

    useEffect(() => {
        if (!id) return;
        setLoading(true);

        const fetchData = async () => {
            try {
                const projRes = await api.get<{ project: Project }>(`/projects/${id}`);
                setProject(projRes.project);

                const teamRes = await api.get<any[]>(`/projects/${id}/teams`);
                setTeams(teamRes || []);

                if (projRes.project.class_id) {
                    const classRes = await api.get<any>(`/classes/${projRes.project.class_id}`);
                    if (classRes && Array.isArray(classRes.students)) {
                        setClassStudents(classRes.students);
                    }
                }
                
                await fetchResources();
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [id]);

    useEffect(() => {
        const tid = teamIdParam ? Number(teamIdParam) : null;
        setSelectedTeamId(tid);
        fetchTasks(tid);
    }, [teamIdParam, showArchived]);

    useEffect(() => {
        const taskId = searchParams.get('task');
        if (taskId && tasks.length > 0) {
            const task = tasks.find(t => t.id === Number(taskId));
            if (task) {
                setSelectedTask(task);
            } else {
                setSelectedTask(null);
            }
        } else if (!taskId) {
            setSelectedTask(null);
        }

        const viewParam = searchParams.get('view');
        if (viewParam && ['home', 'board', 'timeline', 'calendar', 'resources'].includes(viewParam)) {
            setViewMode(viewParam as any);
        }
    }, [searchParams, tasks]);

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
        } catch (e) {
            console.error(e);
        }
    };

    const fetchResources = async () => {
        try {
            const data = await api.get<any[]>(`/projects/${id}/resources`);
            setProjectResources(data || []);
        } catch (e) {
            console.error(e);
        }
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

    const handleDeleteResource = async (resourceId: number) => {
        if (!window.confirm('Are you sure you want to delete this resource?')) return;
        try {
            await api.delete(`/resources/${resourceId}`);
            addToast('Resource deleted', 'success');
            fetchResources();
        } catch (e) {
            console.error('Failed to delete resource', e);
            addToast('Failed to delete resource', 'error');
        }
    };

    const handleTaskCreated = () => {
        fetchTasks(selectedTeamId);
        setTimelineRefresh(prev => prev + 1);
    };

    const handleTaskSelect = (task: Task | null) => {
        const newParams = new URLSearchParams(searchParams);
        if (task) {
            newParams.set('task', task.id.toString());
        } else {
            newParams.delete('task');
        }
        setSearchParams(newParams);
    };

    const handleTaskDrop = async (taskId: number, newStatus: string) => {
        const task = tasks.find(t => t.id === taskId);
        if (!task) return;

        if (newStatus === 'stuck') {
            if (task.is_stuck) return;
            try {
                await api.post(`/tasks/${taskId}/toggle-stuck`, { is_stuck: true });
                addToast("Task marked as stuck", "success");
                fetchTasks(selectedTeamId);
            } catch (e) {
                addToast("Failed to update status", "error");
            }
            return;
        }

        const additionalFields = task.is_stuck ? { is_stuck: false } : {};
        
        try {
            await api.put(`/tasks/${taskId}`, { status: newStatus as any, ...additionalFields });
            fetchTasks(selectedTeamId);
        } catch (e) {
            addToast("Failed to move task", "error");
        }
    };

    const handleCritiqueSubmit = async (warm: string, cool: string, requiresRevision: boolean) => {
        if (!critiqueTask) return;
        try {
            await api.submitFeedback(critiqueTask.id!, {
                warm_feedback: warm,
                cool_feedback: cool,
                requires_revision: requiresRevision
            });
            addToast("Feedback submitted", "success");
            setIsCritiqueModalOpen(false);
            setCritiqueTask(null);
            fetchTasks(selectedTeamId);
        } catch (e) {
            addToast("Failed to submit feedback", "error");
        }
    };

    const handleAddResourceClick = () => {
        // Implement modal or inline form here. For now, we'll use a placeholder.
        addToast("Resource creation modal placeholder", "info");
    };

    const selectedTeam = teams.find(t => t.id === selectedTeamId);
    const availableAssignees = selectedTeam ? selectedTeam.members : [];

    const filteredTasks = tasks.filter(t => !t.parent_task_id);
    const todoTasks = filteredTasks.filter(t => t.status === 'todo' && !t.is_stuck && (!priorityFilter || t.priority === priorityFilter) && (!assigneeFilter || String(t.assignee_id) === assigneeFilter));
    const doingTasks = filteredTasks.filter(t => t.status === 'doing' && !t.is_stuck && (!priorityFilter || t.priority === priorityFilter) && (!assigneeFilter || String(t.assignee_id) === assigneeFilter));
    const stuckTasks = filteredTasks.filter(t => t.is_stuck && (!priorityFilter || t.priority === priorityFilter) && (!assigneeFilter || String(t.assignee_id) === assigneeFilter));
    const doneTasks = filteredTasks.filter(t => t.status === 'done' && (!priorityFilter || t.priority === priorityFilter) && (!assigneeFilter || String(t.assignee_id) === assigneeFilter));

    if (loading) return (
        <div className="flex items-center justify-center h-screen bg-gray-50">
            <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                <p className="text-gray-500 font-medium">Loading project board...</p>
            </div>
        </div>
    );

    return (
        <div className="h-[calc(100vh-64px)] flex flex-col bg-gray-50 overflow-hidden">
            {/* Project Header */}
            <header className="bg-white border-b border-gray-200 px-4 py-3 sm:px-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <Link to="/teacher/dashboard" className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-500">
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                        <div>
                            <h1 className="text-lg font-bold text-gray-900 leading-tight truncate max-w-[200px] sm:max-w-md">
                                {project?.title}
                            </h1>
                            <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-xs text-indigo-600 font-medium bg-indigo-50 px-2 py-0.5 rounded flex items-center gap-1.5 shadow-sm">
                                    {selectedTeam ? selectedTeam.name : 'Teacher Overview'}
                                    {selectedTeam && (stuckTasks.length > 0 || tasks.some(t => t.due_date && new Date(t.due_date) < new Date() && t.status !== 'done')) && (
                                        <div title="Attention Required">
                                            <AlertTriangle className="w-3 h-3 text-amber-500 animate-pulse" />
                                        </div>
                                    )}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {isStaff && (
                            <>
                                <button 
                                    onClick={handleEditProject}
                                    className="flex items-center gap-2 px-3 py-2 text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 hover:border-indigo-300 hover:text-indigo-600 rounded-lg transition-all shadow-sm text-sm font-bold"
                                    title="Edit Project Details"
                                >
                                    <Settings className="w-4 h-4 text-gray-400 group-hover:text-indigo-500" />
                                    <span>Edit Project</span>
                                </button>

                                {selectedTeam && (
                                    <button 
                                        onClick={() => setIsTeamMembersOpen(true)}
                                        className="flex items-center gap-2 px-3 py-2 text-indigo-700 bg-indigo-50 border border-indigo-100 hover:bg-indigo-100 hover:border-indigo-200 rounded-lg transition-all shadow-sm text-sm font-bold"
                                        title="Manage Team Members"
                                    >
                                        <UserPlus className="w-4 h-4" />
                                        <span>Manage Team</span>
                                    </button>
                                )}

                                <div className="h-8 w-px bg-gray-200 mx-1 hidden sm:block"></div>

                                <button 
                                    onClick={() => setIsAssignmentModalOpen(true)}
                                    className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                    title="Peer Assignments"
                                >
                                    <Users className="w-5 h-5" />
                                </button>
                                <button 
                                    onClick={handleDeleteProject}
                                    className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                    title="Delete Project"
                                >
                                    <Trash2 className="w-5 h-5" />
                                </button>
                            </>
                        )}
                    </div>
                </div>

                {/* View Tabs - Scrollable on Mobile */}
                <div className="flex items-center sm:justify-end gap-1 mt-4 border-t border-transparent overflow-x-auto no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
                    <button 
                        onClick={() => { setViewMode('home'); searchParams.delete('task'); setSearchParams(searchParams); }}
                        className={`flex items-center gap-2 px-4 py-2.5 text-sm font-bold border-b-2 transition-all shrink-0 ${viewMode === 'home' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
                    >
                        <LayoutIcon className="w-4 h-4" /> Home
                    </button>
                    <button 
                        onClick={() => { setViewMode('timeline'); searchParams.delete('task'); setSearchParams(searchParams); }}
                        className={`flex items-center gap-2 px-4 py-2.5 text-sm font-bold border-b-2 transition-all shrink-0 ${viewMode === 'timeline' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
                    >
                        <Clock className="w-4 h-4" /> Timeline
                    </button>
                    <button 
                        onClick={() => { setViewMode('board'); searchParams.delete('task'); setSearchParams(searchParams); }}
                        className={`flex items-center gap-2 px-4 py-2.5 text-sm font-bold border-b-2 transition-all shrink-0 ${viewMode === 'board' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
                    >
                        <BarChart className="w-4 h-4" /> Board
                    </button>
                    <button 
                        onClick={() => { setViewMode('calendar'); searchParams.delete('task'); setSearchParams(searchParams); }}
                        className={`flex items-center gap-2 px-4 py-2.5 text-sm font-bold border-b-2 transition-all shrink-0 ${viewMode === 'calendar' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
                    >
                        <Calendar className="w-4 h-4" /> Calendar
                    </button>
                    <button 
                        onClick={() => { setViewMode('resources'); searchParams.delete('task'); setSearchParams(searchParams); }}
                        className={`flex items-center gap-2 px-4 py-2.5 text-sm font-bold border-b-2 transition-all shrink-0 ${viewMode === 'resources' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
                    >
                        <Library className="w-4 h-4" /> Resources
                    </button>
                </div>
            </header>

            {/* Filters Bar - Only visible in Board/Timeline views */}
            {(viewMode === 'board' || viewMode === 'timeline') && (
                <div className="bg-white border-b border-gray-200 px-4 py-2 sm:px-6 flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-tight">Team:</span>
                        <select 
                            value={selectedTeamId || ''} 
                            onChange={(e) => setSearchParams(e.target.value ? { team_id: e.target.value } : {})}
                            className="text-sm border-gray-200 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 py-1 pl-2 pr-8"
                        >
                            <option value="">Overview (All Teams)</option>
                            {teams.map(t => (
                                <option key={t.id} value={t.id}>{t.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-tight">Priority:</span>
                        <select 
                            value={priorityFilter} 
                            onChange={(e) => setPriorityFilter(e.target.value)}
                            className="text-sm border-gray-200 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 py-1 pl-2 pr-8"
                        >
                            <option value="">All</option>
                            <option value="P1">P1 - Critical</option>
                            <option value="P2">P2 - High</option>
                            <option value="P3">P3 - Normal</option>
                        </select>
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-tight">Assignee:</span>
                        <select 
                            value={assigneeFilter} 
                            onChange={(e) => setAssigneeFilter(e.target.value)}
                            className="text-sm border-gray-200 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 py-1 pl-2 pr-8"
                        >
                            <option value="">All</option>
                            {availableAssignees.map((m: any) => (
                                <option key={m.id} value={String(m.id)}>{m.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-tight">Archived:</span>
                        <input 
                            type="checkbox"
                            checked={showArchived}
                            onChange={(e) => setShowArchived(e.target.checked)}
                            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                    </div>
                </div>
            )}

            {/* Main Content Area */}
            <main className="flex-1 overflow-hidden relative">
                {viewMode === 'home' && project && (
                    <div className="h-full overflow-y-auto custom-scrollbar">
                        <ProjectHomeView
                            project={project}
                            currentUser={user}
                            teams={teams}
                            tasks={tasks.filter(t => !t.parent_task_id)}
                            onTeamSelect={(teamId) => {
                                setSearchParams({ team_id: teamId.toString() });
                                setViewMode('board');
                            }}
                            onProjectUpdate={(updatedProject) => setProject(updatedProject)}
                        />
                    </div>
                )}

                {viewMode === 'board' && (
                    <div className="h-full overflow-x-auto overflow-y-hidden px-4 sm:px-6 py-4 flex gap-4 sm:gap-6 snap-x snap-mandatory custom-scrollbar">
                        <KanbanColumn 
                            title="To Do" 
                            status="todo" 
                            tasks={todoTasks} 
                            onAdd={() => setIsCreateTaskOpen(true)} 
                            onDrop={handleTaskDrop} 
                            onTaskClick={handleTaskSelect} 
                        />
                        <KanbanColumn 
                            title="In Progress" 
                            status="doing" 
                            tasks={doingTasks} 
                            onAdd={() => setIsCreateTaskOpen(true)} 
                            onDrop={handleTaskDrop} 
                            onTaskClick={handleTaskSelect} 
                        />
                        <KanbanColumn 
                            title="Stuck" 
                            status="stuck" 
                            tasks={stuckTasks} 
                            onAdd={() => setIsCreateTaskOpen(true)} 
                            onDrop={handleTaskDrop} 
                            onTaskClick={handleTaskSelect} 
                        />
                        <KanbanColumn 
                            title="Done" 
                            status="done" 
                            tasks={doneTasks} 
                            onAdd={() => setIsCreateTaskOpen(true)} 
                            onDrop={handleTaskDrop} 
                            onTaskClick={handleTaskSelect} 
                        />
                    </div>
                )}

                {viewMode === 'timeline' && selectedTeamId && (
                    <div className="h-full overflow-hidden bg-white">
                        <TimelineView
                            teamId={selectedTeamId}
                            projectProp={project!}
                            onAddTask={() => setIsCreateTaskOpen(true)}
                            showArchived={showArchived}
                            onTaskClick={handleTaskSelect}
                            refreshTrigger={timelineRefresh}
                        />
                    </div>
                )}

                {viewMode === 'calendar' && (
                    <div className="h-full overflow-y-auto">
                        <CalendarView 
                            projectId={Number(id)} 
                            teamId={selectedTeamId || undefined}
                            showHeader={true}
                            showFilters={false}
                            onEventClick={(event) => {
                                if (event.sourceType === 'task') {
                                    handleTaskSelect({ id: event.sourceId } as Task);
                                }
                            }}
                        />
                    </div>
                )}

                {viewMode === 'resources' && (
                    <div className="h-full overflow-y-auto p-4 sm:p-6 bg-white border-t border-gray-100">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">Project Library</h2>
                            <button
                                onClick={handleAddResourceClick}
                                className="flex items-center text-sm bg-indigo-600 text-white px-3 py-1.5 rounded-md hover:bg-indigo-700 transition shadow-sm font-bold"
                            >
                                <Plus className="w-4 h-4 mr-1" /> Add Resource
                            </button>
                        </div>
                        
                        {projectResources.length === 0 ? (
                            <div className="text-center py-16 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                                <Library className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                                <p className="text-gray-500 font-medium">No resources added to this project yet.</p>
                                <p className="text-sm text-gray-400 mt-1">Shared files and links will appear here.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {projectResources.map(res => (
                                    <div key={res.id} className="p-4 bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-all group">
                                        <div className="flex justify-between items-start mb-2 group-hover:pr-20 relative">
                                            <h3 className="font-semibold text-gray-900 line-clamp-1 flex-1 pr-2" title={res.title || res.url}>{res.title || res.url}</h3>
                                            <div className="flex gap-1 absolute right-0 top-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <a href={res.url} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-indigo-600 transition-colors bg-gray-50 p-1.5 rounded-lg">
                                                    <ExternalLink className="w-4 h-4" />
                                                </a>
                                                <button onClick={() => handleDeleteResource(res.id)} className="text-gray-400 hover:text-red-600 transition-colors bg-gray-50 p-1.5 rounded-lg">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                        <div className="text-xs text-gray-500 flex items-center gap-2">
                                            <span className="px-1.5 py-0.5 rounded bg-gray-100 font-bold uppercase text-[9px] tracking-wide">{res.type}</span>
                                            <span className="truncate">{res.url}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </main>

            {/* Modals Container */}
            {project && (
                <>
                    <CreateTaskModal
                        project={project}
                        existingTasks={tasks}
                        isOpen={isCreateTaskOpen}
                        onClose={() => {
                            setIsCreateTaskOpen(false);
                            setTaskToEdit(null);
                        }}
                        onTaskCreated={handleTaskCreated}
                        defaultTeamId={selectedTeamId}
                        availableMembers={availableAssignees}
                        teams={teams}
                        taskToEdit={taskToEdit}
                    />

                    {selectedTask && (
                        <TaskDetailsModal
                            key={selectedTask.id}
                            task={selectedTask}
                            project={project}
                            isOpen={!!selectedTask}
                            onClose={() => {
                                handleTaskSelect(null);
                                fetchTasks(selectedTeamId);
                            }}
                            onTaskUpdate={() => {
                                fetchTasks(selectedTeamId);
                            }}
                            onEditTask={(t) => {
                                setSelectedTask(null);
                                setTaskToEdit(t);
                                setIsCreateTaskOpen(true);
                            }}
                        />
                    )}

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

                    <PeerAssignmentModal
                        isOpen={isAssignmentModalOpen}
                        onClose={() => setIsAssignmentModalOpen(false)}
                        projectId={Number(id)}
                    />

                    <TeamContributionsModal
                        isOpen={isContributionsOpen}
                        onClose={() => setIsContributionsOpen(false)}
                        teamId={selectedTeamId || 0}
                        teamName={selectedTeam?.name || ''}
                    />

                    {critiqueTask && (
                        <CritiqueModal
                            isOpen={isCritiqueModalOpen}
                            onClose={() => {
                                setIsCritiqueModalOpen(false);
                                setCritiqueTask(null);
                            }}
                            onSubmit={handleCritiqueSubmit}
                            taskTitle={critiqueTask.title}
                        />
                    )}
                </>
            )}
        </div>
    );
};

export default ProjectBoard;
