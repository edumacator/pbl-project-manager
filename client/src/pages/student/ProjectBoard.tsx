import React, { useState, useEffect } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { TeamSidebar } from '../../components/board/TeamSidebar';
import { TeamKanban } from '../../components/board/TeamKanban';
import TimelineView from '../../components/TimelineView'; // Reusing existing timeline
import { TaskDetailsModal } from '../../components/TaskDetailsModal';
import { TeamResources } from '../../components/TeamResources';
import { api } from '../../api/client';
import { Task } from '../../types';
import { ArrowLeft, Layout as LayoutIcon, Calendar, Book, Home } from 'lucide-react';
import { CreateTaskModal } from '../../components/CreateTaskModal';
import { CritiqueModal } from '../../components/CritiqueModal';
import { ReflectionModal } from '../../components/ReflectionModal';
import { ProjectHomeView } from '../../components/ProjectHomeView';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';

export const StudentProjectBoard: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [data, setData] = useState<any>(null);
    const [activeTab, setActiveTab] = useState<'home' | 'board' | 'timeline' | 'resources'>('board');
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [timelineRefresh, setTimelineRefresh] = useState(0);

    const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
    const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);
    const [isCritiqueModalOpen, setIsCritiqueModalOpen] = useState(false);
    const [critiqueTask, setCritiqueTask] = useState<Task | null>(null);

    const [isReflectionModalOpen, setIsReflectionModalOpen] = useState(false);
    const [reflectionTask, setReflectionTask] = useState<Task | null>(null);
    const [reflectionTransition, setReflectionTransition] = useState<'start_work' | 'finish_task'>('start_work');
    const [pendingStatus, setPendingStatus] = useState<string | null>(null);

    const { addToast } = useToast();

    const [searchParams, setSearchParams] = useSearchParams();
    const taskIdParam = searchParams.get('task');

    useEffect(() => {
        loadTeamContext();
    }, [id]);

    useEffect(() => {
        if (data && taskIdParam) {
            const taskIdDecoded = Number(taskIdParam);
            const task = data.tasks?.find((t: Task) => t.id === taskIdDecoded);
            if (task) {
                setSelectedTask(task);
            }
        }
    }, [data, taskIdParam]);

    const loadTeamContext = async () => {
        try {
            setLoading(true);
            const res = await api.get(`/projects/${id}/team-context`);
            setData(res);
        } catch (err: any) {
            console.error(err);
            setError(err.response?.data?.error?.message || "Failed to load project board.");
        } finally {
            setLoading(false);
        }
    };

    const handleTaskClaim = async (taskId: number) => {
        if (!user) return;
        try {
            await api.updateTask(taskId, { assignee_id: user.id });
            loadTeamContext();
            setTimelineRefresh(prev => prev + 1);
        } catch (err) {
            console.error("Failed to claim task", err);
        }
    };

    const handleTaskMove = async (taskId: number, newStatus: string) => {
        // Find existing task to check if status changed to avoid redundant API calls
        const task = data.tasks?.find((t: Task) => t.id === taskId);
        if (!task || task.status === newStatus) return;

        // Transition Logic: Teachers move tasks directly, students see rituals/gatekeepers
        if (user?.role === 'student') {
            // Reflection Logic - Only if enabled for this project
            if (data.project?.requires_reflection) {
                if (task.status === 'todo' && newStatus === 'doing') {
                    setReflectionTask(task);
                    setReflectionTransition('start_work');
                    setPendingStatus(newStatus);
                    setIsReflectionModalOpen(true);
                    return;
                }

                if (task.status === 'doing' && newStatus === 'done') {
                    // Check if it needs critique first
                    if (task.is_completable === false) {
                        setCritiqueTask(task);
                        setIsCritiqueModalOpen(true);
                        return;
                    }

                    setReflectionTask(task);
                    setReflectionTransition('finish_task');
                    setPendingStatus(newStatus);
                    setIsReflectionModalOpen(true);
                    return;
                }
            }

            // Boundary / Gatekeeper Logic (fallback for other transitions if needed)
            if (newStatus === 'done' && task.is_completable === false) {
                setCritiqueTask(task);
                setIsCritiqueModalOpen(true);
                return;
            }
        }

        await executeTaskMove(taskId, newStatus);
    };

    const executeTaskMove = async (taskId: number, newStatus: string) => {
        // Optimistic update
        setData((prev: any) => ({
            ...prev,
            tasks: prev.tasks.map((t: Task) => t.id === taskId ? { ...t, status: newStatus as any } : t)
        }));

        try {
            await api.updateTask(taskId, { status: newStatus });
            setTimelineRefresh(prev => prev + 1);
        } catch (err) {
            console.error("Failed to move task", err);
            // Revert on failure
            loadTeamContext();
        }
    };

    const handleReflectionSubmit = async (content: string) => {
        if (!reflectionTask || !pendingStatus) return;

        try {
            await api.saveTaskReflection(reflectionTask.id, content, reflectionTransition);
            await executeTaskMove(reflectionTask.id, pendingStatus);
            setIsReflectionModalOpen(false);
            setReflectionTask(null);
            setPendingStatus(null);
        } catch (err) {
            console.error("Failed to save reflection", err);
            addToast("Failed to save reflection, but task was moved.", 'error');
            // Still move the task if reflection fails? 
            // The requirement says "Save & Move", implying they go together.
            // Let's at least move the task if the user tried.
            await executeTaskMove(reflectionTask.id, pendingStatus);
            setIsReflectionModalOpen(false);
        }
    };

    const handleReflectionSkip = async () => {
        if (!reflectionTask || !pendingStatus) return;
        await executeTaskMove(reflectionTask.id, pendingStatus);
        setIsReflectionModalOpen(false);
        setReflectionTask(null);
        setPendingStatus(null);
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
                await api.updateTask(critiqueTask.id, { status: 'done' });
                addToast("Feedback submitted. Task completed!", 'success');
            } else {
                await api.updateTask(critiqueTask.id, { status: 'doing' });
                addToast("Feedback submitted. Revision requested.", 'success');
            }

            loadTeamContext();
            setTimelineRefresh(prev => prev + 1);
            setIsCritiqueModalOpen(false);
        } catch (e) {
            console.error("Critique submission failed", e);
            addToast("Failed to submit critique.", 'error');
        }
    };

    if (loading) return <div>Loading...</div>;
    if (error) return <div className="text-red-600 p-8">{error}</div>;
    if (!data) return null;

    return (
        <div className="h-[calc(100vh-64px)] flex flex-col">
            {isCreateTaskOpen && data.project && data.team && (
                <CreateTaskModal
                    project={data.project}
                    existingTasks={data.tasks}
                    isOpen={isCreateTaskOpen}
                    onClose={() => { setIsCreateTaskOpen(false); setTaskToEdit(null); }}
                    onTaskCreated={() => {
                        loadTeamContext();
                        setTimelineRefresh(prev => prev + 1);
                    }}
                    defaultTeamId={data.team.id}
                    availableMembers={data.team.members}
                    teams={[data.team]}
                    taskToEdit={taskToEdit}
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

            {reflectionTask && (
                <ReflectionModal
                    isOpen={isReflectionModalOpen}
                    onClose={() => setIsReflectionModalOpen(false)}
                    onSubmit={handleReflectionSubmit}
                    onSkip={handleReflectionSkip}
                    transitionType={reflectionTransition}
                    taskTitle={reflectionTask.title}
                />
            )}

            {/* Header */}
            <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shadow-sm z-10">
                <div className="flex items-center">
                    <Link to="/student/today" className="mr-4 text-gray-400 hover:text-gray-600">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div>
                        <h1 className="text-xl font-bold text-gray-900">{data.project.title}</h1>
                        <p className="text-sm text-indigo-600 font-medium">Driving Question: {data.project.driving_question}</p>
                    </div>
                </div>

                <div className="flex bg-gray-100 p-1 rounded-lg">
                    <button
                        onClick={() => setActiveTab('home')}
                        className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'home' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        <div className="flex items-center"><Home className="w-4 h-4 mr-2" /> Home</div>
                    </button>
                    <button
                        onClick={() => setActiveTab('board')}
                        className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'board' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        <div className="flex items-center"><LayoutIcon className="w-4 h-4 mr-2" /> Board</div>
                    </button>
                    <button
                        onClick={() => setActiveTab('timeline')}
                        className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'timeline' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        <div className="flex items-center"><Calendar className="w-4 h-4 mr-2" /> Timeline</div>
                    </button>
                    <button
                        onClick={() => setActiveTab('resources')}
                        className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'resources' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        <div className="flex items-center"><Book className="w-4 h-4 mr-2" /> Resources</div>
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 flex overflow-hidden">
                <div className="flex-1 overflow-hidden bg-gray-50 relative">
                    {activeTab === 'home' && data.project && (
                        <ProjectHomeView
                            project={data.project}
                            currentUser={user}
                            teams={data.team ? [data.team] : []}
                            tasks={data.tasks || []}
                            onTeamSelect={() => setActiveTab('board')}
                            onProjectUpdate={() => { }}
                        />
                    )}
                    {activeTab === 'board' && (
                        data.team ? (
                            <TeamKanban
                                tasks={data.tasks}
                                onTaskMove={handleTaskMove}
                                onTaskClaim={handleTaskClaim}
                                onTaskClick={(task) => setSelectedTask(task)}
                                onTaskAdd={() => { setTaskToEdit(null); setIsCreateTaskOpen(true); }}
                            />
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-gray-500 p-8 text-center">
                                <LayoutIcon className="w-16 h-16 mb-4 opacity-20" />
                                <h2 className="text-xl font-semibold mb-2">You haven't joined a team yet</h2>
                                <p>Once your teacher assigns you to a team, you'll be able to manage tasks here.</p>
                            </div>
                        )
                    )}
                    {activeTab === 'timeline' && (
                        data.team ? (
                            <div className="h-full p-4 overflow-auto">
                                <TimelineView
                                    teamId={data.team.id}
                                    onTaskClick={(task) => setSelectedTask(task)}
                                    onAddTask={() => { setTaskToEdit(null); setIsCreateTaskOpen(true); }}
                                    refreshTrigger={timelineRefresh}
                                />
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-gray-500 p-8 text-center">
                                <Calendar className="w-16 h-16 mb-4 opacity-20" />
                                <h2 className="text-xl font-semibold mb-2">Timeline Unavailable</h2>
                                <p>The project timeline will be available once you are part of a team.</p>
                            </div>
                        )
                    )}
                    {activeTab === 'resources' && (
                        <div className="h-full overflow-hidden bg-white">
                            <TeamResources teamId={data.team?.id} projectId={data.project.id} />
                        </div>
                    )}
                </div>
                <TeamSidebar 
                    teamName={data.team?.name || 'Joining Team...'} 
                    members={data.team?.members || []} 
                />
            </div>

            <TaskDetailsModal
                isOpen={!!selectedTask}
                onClose={() => {
                    setSelectedTask(null);
                    if (taskIdParam) {
                        searchParams.delete('task');
                        setSearchParams(searchParams);
                    }
                }}
                task={selectedTask}
                project={data.project}
                onTaskClaim={handleTaskClaim}
                onEditTask={(t) => {
                    setTaskToEdit(t);
                    setIsCreateTaskOpen(true);
                    setSelectedTask(null);
                }}
            />
        </div>
    );
};
