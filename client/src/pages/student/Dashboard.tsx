
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import { Task } from '../../types';
import { Clock, AlertCircle, MessageSquare, Lock, PartyPopper, AlertTriangle, Layers } from 'lucide-react';
import StuckTaskModal from '../../components/StuckTaskModal';

// Fix type inheritance issue where Task import was missing
interface DashboardTask extends Task {
    priority: string;
    project_title: string;
    blocker_count: number;
}

interface DashboardData {
    my_projects: any[];
    next_tasks: DashboardTask[];
    pending_reviews: any[];
    upcoming_checkpoints: any[];
}

const StudentDashboard: React.FC = () => {
    const [data, setData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);
    const [stuckModalTask, setStuckModalTask] = useState<DashboardTask | null>(null);

    const loadDashboard = () => {
        setLoading(true);
        api.get<DashboardData>('/student/dashboard')
            .then(data => setData(data))
            .catch(err => console.error(err))
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        loadDashboard();
    }, []);

    if (loading) return <div className="p-8 text-center text-gray-500">Loading Mission Control...</div>;
    if (!data) return <div className="p-8 text-center text-red-500">Failed to load dashboard.</div>;

    const { my_projects, next_tasks, pending_reviews, upcoming_checkpoints } = data;

    const stuckTasks = next_tasks.filter((t: DashboardTask) => t.is_stuck);
    const regularTasks = next_tasks.filter((t: DashboardTask) => !t.is_stuck);

    return (
        <div className="max-w-6xl mx-auto p-6">
            <header className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900">Mission Control 🚀</h1>
                <p className="text-gray-500">Your prioritized command center.</p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                {/* Left Sidebar: Project Navigator (3 cols) */}
                <div className="lg:col-span-3 space-y-6">
                    <section className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                        <h2 className="flex items-center text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">
                            <Layers className="w-4 h-4 mr-2" />
                            My Projects
                        </h2>
                        {my_projects.length === 0 ? (
                            <p className="text-sm text-gray-400 italic">No active projects.</p>
                        ) : (
                            <ul className="space-y-3">
                                {my_projects.map(proj => (
                                    <li key={proj.id}>
                                        <Link to={`/projects/${proj.id}`} className="block group">
                                            <div className="font-medium text-gray-800 group-hover:text-indigo-600 transition-colors">
                                                {proj.title}
                                            </div>
                                            <div className="text-xs text-gray-500">
                                                {proj.team_name ? `Team: ${proj.team_name}` : 'No Team'}
                                                {proj.role && <span className="ml-1 text-gray-400">({proj.role})</span>}
                                            </div>
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </section>
                </div>

                {/* Center: Next Steps (6 cols) */}
                <div className="lg:col-span-6 space-y-6">
                    <section>
                        <h2 className="flex items-center text-xl font-bold text-gray-800 mb-4">
                            <Clock className="w-6 h-6 mr-2 text-indigo-600" />
                            Next Steps
                        </h2>

                        <div className="space-y-4">
                            {regularTasks.length === 0 ? (
                                <div className="p-10 text-center bg-gray-50 rounded-xl border border-dashed border-gray-300 text-gray-500">
                                    <PartyPopper className="w-10 h-10 mx-auto mb-3 text-yellow-500" />
                                    <p className="font-medium">All caught up!</p>
                                    <p className="text-sm">Check your project backlog for more.</p>
                                </div>
                            ) : (
                                regularTasks.map(task => (
                                    <div key={task.id} className={`bg-white p-5 rounded-xl border shadow-sm relative overflow-hidden group hover:shadow-md transition-all ${task.priority === 'high' ? 'border-l-4 border-l-red-500' :
                                        task.priority === 'low' ? 'border-l-4 border-l-gray-300' : 'border-l-4 border-l-blue-400'
                                        }`}>

                                        {/* Status / Checkbox */}
                                        <div className="absolute top-5 left-4">
                                            {/* Handled by border-l for priority color */}
                                        </div>

                                        <div className="flex justify-between items-start mb-2">
                                            <div className="flex flex-col">
                                                <span className={`text-xs font-bold uppercase tracking-wide mb-1 ${task.priority === 'high' ? 'text-red-600' :
                                                    task.priority === 'low' ? 'text-gray-500' : 'text-blue-500'
                                                    }`}>
                                                    {task.priority || 'Medium'} Priority
                                                </span>
                                                <h3 className="text-lg font-bold text-gray-900 group-hover:text-indigo-600">
                                                    <Link to={`/student/projects/${task.project_id}?task=${task.id}`}>
                                                        {task.title}
                                                    </Link>
                                                </h3>
                                            </div>
                                            <Link to={`/student/projects/${task.project_id}`} className="text-xs text-gray-400 hover:text-gray-600">
                                                {task.project_title}
                                            </Link>
                                        </div>

                                        <p className="text-sm text-gray-600 mb-3 line-clamp-2">{task.description || 'No description'}</p>

                                        {/* Meta: Due Date, Blockers, Stuck */}
                                        <div className="flex flex-wrap items-center gap-3 text-xs">
                                            {task.due_date && (
                                                <span className={`px-2 py-1 rounded font-medium ${new Date(task.due_date) < new Date() ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'}`}>
                                                    Due: {new Date(task.due_date).toLocaleDateString()}
                                                </span>
                                            )}

                                            {Number(task.blocker_count) > 0 && (
                                                <span className="flex items-center text-red-600 bg-red-50 px-2 py-1 rounded">
                                                    <Lock className="w-3 h-3 mr-1" /> Blocked
                                                </span>
                                            )}

                                            {task.is_stuck && (
                                                <span className="flex items-center text-amber-700 bg-amber-50 px-2 py-1 rounded border border-amber-100">
                                                    <AlertTriangle className="w-3 h-3 mr-1" /> Stuck (3+ days)
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </section>
                </div>

                {/* Right Sidebar: Reviews & Reflections (3 cols) */}
                <div className="lg:col-span-3 space-y-6">

                    {/* Stuck Tasks */}
                    <section className="bg-amber-50 p-4 rounded-xl border border-amber-200 shadow-sm relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-1 h-full bg-amber-500"></div>
                        <h2 className="flex items-center text-sm font-bold text-amber-900 mb-4 uppercase tracking-wider">
                            <AlertTriangle className="w-4 h-4 mr-2 text-amber-600" />
                            Stuck Tasks
                        </h2>
                        {stuckTasks.length === 0 ? (
                            <p className="text-amber-700/60 text-sm">No tasks currently stuck.</p>
                        ) : (
                            <div className="space-y-3">
                                {stuckTasks.map((task: DashboardTask) => (
                                    <div
                                        key={task.id}
                                        onClick={() => setStuckModalTask(task)}
                                        className="bg-white p-3 rounded-lg border border-amber-200 shadow-sm cursor-pointer hover:shadow-md transition-all group"
                                        title="Click to Resolve"
                                    >
                                        <div className="font-semibold text-gray-900 text-sm group-hover:text-amber-700 transition-colors line-clamp-2 mb-1">
                                            {task.title}
                                        </div>
                                        <div className="text-[10px] text-amber-600 uppercase font-bold mb-2">Needs Action</div>
                                        <button className="w-full text-center py-1.5 bg-amber-600 text-white rounded text-xs font-semibold hover:bg-amber-700 transition-colors shadow-sm">
                                            Get Unstuck
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>

                    {/* Peer Reviews */}
                    <section className="bg-white p-4 rounded-xl border border-indigo-100 shadow-sm">
                        <h2 className="flex items-center text-sm font-bold text-gray-900 mb-4 uppercase tracking-wider">
                            <MessageSquare className="w-4 h-4 mr-2 text-indigo-600" />
                            To Review
                        </h2>
                        {pending_reviews.length === 0 ? (
                            <p className="text-gray-400 text-sm">No pending reviews.</p>
                        ) : (
                            <div className="space-y-3">
                                {pending_reviews.map(review => (
                                    <div key={review.id} className="bg-indigo-50 p-3 rounded-lg border border-indigo-100">
                                        <div className="text-sm font-medium text-indigo-900 mb-1">{review.reviewee_name}</div>
                                        <div className="text-xs text-indigo-600 mb-2 truncate">{review.task_title || 'General Review'}</div>
                                        <Link
                                            to={`/student/reviews/${review.id}`}
                                            className="block w-full text-center py-1.5 bg-indigo-600 text-white rounded text-xs font-semibold hover:bg-indigo-700 transition-colors"
                                        >
                                            Start Critique
                                        </Link>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>

                    {/* Reflections */}
                    <section className="bg-amber-50 p-4 rounded-xl border border-amber-100 shadow-sm">
                        <h2 className="flex items-center text-sm font-bold text-amber-900 mb-4 uppercase tracking-wider">
                            <AlertCircle className="w-4 h-4 mr-2 text-amber-600" />
                            Reflections
                        </h2>
                        {upcoming_checkpoints.length === 0 ? (
                            <p className="text-amber-700/60 text-sm">No checkpoints due soon.</p>
                        ) : (
                            <div className="space-y-3">
                                {upcoming_checkpoints.map((cp, idx) => (
                                    <div key={idx} className="bg-white/60 p-3 rounded-lg border border-amber-200/50">
                                        <div className="font-semibold text-amber-900 text-xs">{cp.title}</div>
                                        <div className="text-[10px] text-amber-800 mt-1 uppercase">Due: {new Date(cp.due_date).toLocaleDateString()}</div>
                                        <Link to={`/projects/${cp.project_id}`} className="mt-2 block text-center py-1.5 bg-amber-500 text-white rounded text-xs font-semibold hover:bg-amber-600 transition-colors">
                                            View
                                        </Link>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>
                </div>
            </div>

            {stuckModalTask && (
                <StuckTaskModal
                    task={stuckModalTask}
                    onClose={() => setStuckModalTask(null)}
                    onResolved={() => {
                        setStuckModalTask(null);
                        loadDashboard(); // Refresh to remove task from stuck list
                    }}
                />
            )}
        </div>
    );
};

export default StudentDashboard;
