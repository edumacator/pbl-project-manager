import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { TeamSidebar } from '../../components/board/TeamSidebar';
import { TeamKanban } from '../../components/board/TeamKanban';
import TimelineView from '../../components/TimelineView'; // Reusing existing timeline
import { TaskDetailsModal } from '../../components/TaskDetailsModal';
import { api } from '../../api/client';
import { Task } from '../../types';
import { ArrowLeft, Layout as LayoutIcon, Calendar, Book } from 'lucide-react';

export const StudentProjectBoard: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [data, setData] = useState<any>(null);
    const [activeTab, setActiveTab] = useState<'board' | 'timeline' | 'resources'>('board');
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [timelineRefresh, setTimelineRefresh] = useState(0);

    useEffect(() => {
        loadTeamContext();
    }, [id]);

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
        try {
            await api.updateTask(taskId, { assignee_id: 2 }); // Hardcoded assigned to student "Alice" (ID 2)
            loadTeamContext();
            setTimelineRefresh(prev => prev + 1);
        } catch (err) {
            console.error("Failed to claim task", err);
        }
    };

    if (loading) return <div>Loading...</div>;
    if (error) return <div className="text-red-600 p-8">{error}</div>;
    if (!data) return null;

    return (
        <div className="h-[calc(100vh-64px)] flex flex-col">
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
                    {activeTab === 'board' && (
                        <TeamKanban
                            tasks={data.tasks}
                            onTaskMove={() => { }} // Implement later
                            onTaskClaim={handleTaskClaim}
                            onTaskClick={(task) => setSelectedTask(task)}
                        />
                    )}
                    {activeTab === 'timeline' && (
                        <div className="h-full p-4 overflow-auto">
                            <TimelineView
                                teamId={data.team.id}
                                onTaskClick={(task) => setSelectedTask(task)}
                                refreshTrigger={timelineRefresh}
                            />
                        </div>
                    )}
                    {activeTab === 'resources' && (
                        <div className="h-full overflow-hidden bg-white">
                            <TeamResources teamId={data.team.id} projectId={data.project.id} />
                        </div>
                    )}
                </div>
                <TeamSidebar teamName={data.team.name} members={data.team.members} />
            </div>

            <TaskDetailsModal
                isOpen={!!selectedTask}
                onClose={() => setSelectedTask(null)}
                task={selectedTask}
                project={data.project}
                onTaskClaim={handleTaskClaim}
            />
        </div>
    );
};
