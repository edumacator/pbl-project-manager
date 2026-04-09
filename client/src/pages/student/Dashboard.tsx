
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import { Task } from '../../types';
import { Clock, AlertCircle, MessageSquare, Lock, PartyPopper, AlertTriangle, Layers, UserPlus, Paperclip } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';

// Fix type inheritance issue where Task import was missing
interface DashboardTask extends Task {
    priority: "P1" | "P2" | "P3" | undefined;
    project_title: string;
    blocker_count: number;
    resource_count?: number;
    subtask_count?: number;
    completed_subtask_count?: number;
}

interface DashboardData {
    my_projects: any[];
    next_tasks: DashboardTask[];
    completed_tasks: DashboardTask[];
    pending_reviews: any[];
    upcoming_checkpoints: any[];
    recent_reflections?: {
        task_id: number;
        task_title: string;
        project_id: number;
        project_title: string;
        reflections: any[];
    }[];
    upcoming_milestone_review?: { checkpoint_title: string; due_date: string; project_title: string; project_id: number; };
    momentum: {
        weekly: number;
        streak: number;
    };
}

const StudentDashboard: React.FC = () => {
    const [data, setData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);
    const [expandedReflectionTasks, setExpandedReflectionTasks] = useState<Set<number>>(new Set());
    const { addToast } = useToast();
    const [joinCode, setJoinCode] = useState('');
    const [joining, setJoining] = useState(false);

    const toggleReflectionExpand = (taskId: number) => {
        const newSet = new Set(expandedReflectionTasks);
        if (newSet.has(taskId)) newSet.delete(taskId);
        else newSet.add(taskId);
        setExpandedReflectionTasks(newSet);
    };

    const loadDashboard = () => {
        setLoading(true);
        api.get<DashboardData>('/student/dashboard')
            .then(data => setData(data))
            .catch(err => console.error(err))
            .finally(() => setLoading(false));
    };

    const handleJoinClass = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!joinCode) return;
        setJoining(true);
        try {
            await api.post('/students/join-class', { join_code: joinCode });
            addToast('Successfully joined the class!', 'success');
            setJoinCode('');
            loadDashboard();
        } catch (err: any) {
            addToast(err.message || 'Failed to join class', 'error');
        } finally {
            setJoining(false);
        }
    };

    useEffect(() => {
        loadDashboard();
    }, []);

    if (loading) return <div className="p-8 text-center text-gray-500">Loading Mission Control...</div>;
    if (!data) return <div className="p-8 text-center text-red-500">Failed to load dashboard.</div>;

    const { my_projects, next_tasks, completed_tasks, pending_reviews, upcoming_checkpoints, upcoming_milestone_review, momentum, recent_reflections } = data;

    const stuckTasks = next_tasks.filter((t: DashboardTask) => t.is_stuck);
    const regularTasks = next_tasks.filter((t: DashboardTask) => !t.is_stuck);

    return (
        <div className="max-w-6xl mx-auto p-6">
            <header className="mb-8 flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Mission Control 🚀</h1>
                    <p className="text-gray-500">Your prioritized command center.</p>
                </div>
                {/* Momentum Meter */}
                <div className="flex gap-6 bg-white px-6 py-3 rounded-2xl border border-gray-100 shadow-sm items-center">
                    <div className="text-center">
                        <div className="text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-0.5">This Week</div>
                        <div className="text-xl font-bold text-indigo-600 leading-none">{momentum?.weekly || 0}</div>
                    </div>
                    <div className="w-px h-8 bg-gray-100"></div>
                    <div className="text-center">
                        <div className="text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-0.5">Streak</div>
                        <div className="text-xl font-bold text-amber-500 leading-none flex items-center justify-center gap-1">
                            {momentum?.streak || 0}
                            <span className="text-xs">🔥</span>
                        </div>
                    </div>
                </div>
            </header>

            {/* Join Class section */}
            <section className="bg-indigo-600 p-6 rounded-2xl border border-indigo-700 shadow-lg text-white mb-8 transition-all hover:shadow-xl">
                <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-white/20 rounded-xl">
                            <UserPlus className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold">Join a new class?</h2>
                            <p className="text-indigo-100 text-sm">Enter the 6-digit code provided by your teacher.</p>
                        </div>
                    </div>
                    <form className="flex gap-2 w-full md:w-auto" onSubmit={handleJoinClass}>
                        <input
                            type="text"
                            placeholder="CODE12"
                            className="flex-1 md:flex-none bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-white/50 w-full md:w-32 uppercase font-mono font-bold text-center tracking-widest"
                            value={joinCode}
                            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                            maxLength={6}
                        />
                        <button
                            type="submit"
                            disabled={joining || !joinCode}
                            className="bg-white text-indigo-600 px-8 py-3 rounded-xl font-bold hover:bg-indigo-50 transition-colors disabled:opacity-50 shadow-sm"
                        >
                            {joining ? 'Joining...' : 'Join'}
                        </button>
                    </form>
                </div>
            </section>

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
                                        <Link to={`/student/projects/${proj.id}`} className="block group">
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
                                <div className="space-y-6">
                                    <div className="p-10 text-center bg-gray-50 rounded-xl border border-dashed border-gray-300 text-gray-500">
                                        <PartyPopper className="w-10 h-10 mx-auto mb-3 text-yellow-500" />
                                        <p className="font-medium">All caught up!</p>
                                        <p className="text-sm">Check your project backlog for more.</p>
                                    </div>

                                    {completed_tasks && completed_tasks.length > 0 && (
                                        <div className="mt-8">
                                            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Recently Finished</h3>
                                            <div className="space-y-3 opacity-70">
                                                {completed_tasks.map(task => (
                                                    <div key={task.id} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col gap-2">
                                                        <div className="flex justify-between items-center">
                                                            <div>
                                                                <h4 className="font-medium text-gray-700 line-through decoration-gray-300">{task.title}</h4>
                                                                <p className="text-[10px] text-gray-400">{task.project_title}</p>
                                                            </div>
                                                            <span className="text-[10px] bg-green-50 text-green-600 px-2 py-0.5 rounded-full font-bold">Done</span>
                                                        </div>
                                                        <div className="flex items-center gap-2">
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
                                                                    <Paperclip className="w-3 h-3 text-indigo-300" />
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                regularTasks.map(task => (
                                    <div key={task.id} className={`bg-white p-5 rounded-xl border shadow-sm relative overflow-hidden group hover:shadow-md transition-all ${
                                        task.priority === 'P1' ? 'border-l-4 border-l-red-500' :
                                        task.priority === 'P3' ? 'border-l-4 border-l-gray-300' : 'border-l-4 border-l-indigo-400'
                                    }`}>

                                        {/* Status / Checkbox */}
                                        <div className="absolute top-5 left-4">
                                            {/* Handled by border-l for priority color */}
                                        </div>

                                        <div className="flex justify-between items-start mb-2">
                                            <div className="flex flex-col">
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

                                        {/* Progressive Subtask Bar */}
                                        <div className="mb-4">
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

                                        {/* Meta Footer Row - Sync with Board Layout */}
                                        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-gray-50">
                                            <div className="flex items-center gap-2">
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

                                                {Number(task.blocker_count) > 0 && (
                                                    <span className="flex items-center text-red-600 bg-red-50 px-1.5 py-0.5 rounded text-[8px] font-bold border border-red-100">
                                                        <Lock className="w-2.5 h-2.5 mr-1" /> BLOCKED
                                                    </span>
                                                )}
                                            </div>

                                            <div className="flex items-center gap-2">
                                                {task.due_date && (
                                                    <div className={`text-[10px] flex items-center gap-1 font-bold italic ${
                                                        new Date(task.due_date) < new Date() ? 'text-red-500' : 'text-gray-400'
                                                    }`}>
                                                        <Clock className="w-3 h-3" />
                                                        {new Date(task.due_date).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                                        {new Date(task.due_date) < new Date() && (
                                                            <div title="Overdue">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
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
                                    <Link
                                        key={task.id}
                                        to={`/student/projects/${task.project_id}?task=${task.id}`}
                                        className="block bg-white p-3 rounded-lg border border-amber-200 shadow-sm hover:shadow-md transition-all group"
                                        title="Click to Resolve"
                                    >
                                        <div className="font-semibold text-gray-900 text-sm group-hover:text-amber-700 transition-colors line-clamp-2 mb-1">
                                            {task.title}
                                        </div>
                                        <div className="text-[10px] text-amber-600 uppercase font-bold mb-2">Needs Action</div>
                                        <div className="w-full text-center py-1.5 bg-amber-600 text-white rounded text-xs font-semibold hover:bg-amber-700 transition-colors shadow-sm">
                                            Get Unstuck
                                        </div>
                                    </Link>
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
                            <>
                                <p className="text-gray-400 text-sm">No pending reviews.</p>
                                {upcoming_milestone_review && (
                                    <div className="mt-4 bg-amber-50 p-3 rounded-lg border border-amber-200">
                                        <div className="flex items-center text-amber-900 font-bold text-xs uppercase mb-1">
                                            <AlertCircle className="w-3 h-3 mr-1 text-amber-600" />
                                            Upcoming Milestone
                                        </div>
                                        <div className="text-sm font-medium text-amber-900 mb-1">{upcoming_milestone_review.checkpoint_title}</div>
                                        <div className="text-xs text-amber-700 mb-2 truncate">{upcoming_milestone_review.project_title}</div>
                                        <div className="text-[10px] text-amber-600 font-semibold mb-2">
                                            Due: {new Date(upcoming_milestone_review.due_date).toLocaleDateString()}
                                        </div>
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="space-y-3">
                                {pending_reviews.map(review => (
                                    <div key={review.id} className="bg-indigo-50 p-3 rounded-lg border border-indigo-100">
                                        <div className="text-sm font-medium text-indigo-900 mb-1">{review.reviewee_name}</div>
                                        <div className="text-xs text-indigo-600 mb-2 truncate">
                                            {review.checkpoint_title ? `Milestone: ${review.checkpoint_title}` : (review.task_title || 'General Review')}
                                        </div>
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

                    {/* Reflections & Checkpoints */}
                    <section className="bg-amber-50 p-4 rounded-xl border border-amber-100 shadow-sm">
                        <h2 className="flex items-center text-sm font-bold text-amber-900 mb-4 uppercase tracking-wider">
                            <AlertCircle className="w-4 h-4 mr-2 text-amber-600" />
                            Reflections
                        </h2>

                        <div className="space-y-4">
                            {upcoming_checkpoints.length > 0 && (
                                <div>
                                    <h3 className="text-[10px] font-bold text-amber-800 uppercase mb-2">Milestones Due</h3>
                                    <div className="space-y-2">
                                        {upcoming_checkpoints.map((cp, idx) => (
                                            <div key={idx} className="bg-white/60 p-3 rounded-lg border border-amber-200/50 flex flex-col">
                                                <div className="font-semibold text-amber-900 text-xs">{cp.title}</div>
                                                <div className="text-[10px] text-amber-800 mt-1 uppercase">Due: {new Date(cp.due_date).toLocaleDateString()}</div>
                                                <Link to={`/student/projects/${cp.project_id}`} className="mt-2 text-center py-1 bg-amber-500 text-white rounded text-[10px] font-semibold hover:bg-amber-600 transition-colors">
                                                    View project
                                                </Link>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {recent_reflections && recent_reflections.length > 0 && (
                                <div>
                                    <h3 className="text-[10px] font-bold text-amber-800 uppercase mb-2 mt-4">Past Task Reflections</h3>
                                    <div className="space-y-3">
                                        {recent_reflections.map((group) => {
                                            const isExpanded = expandedReflectionTasks.has(group.task_id);
                                            return (
                                                <div key={group.task_id} className="bg-white/60 rounded-lg border border-amber-200/50 overflow-hidden">
                                                    <button
                                                        onClick={() => toggleReflectionExpand(group.task_id)}
                                                        className="w-full text-left p-2.5 flex justify-between items-center hover:bg-amber-100/50 transition-colors"
                                                    >
                                                        <div>
                                                            <div className="font-semibold text-amber-900 text-xs truncate max-w-[150px]">{group.task_title}</div>
                                                            <div className="text-[9px] text-amber-800 mt-0.5">{group.reflections.length} reflection{group.reflections.length !== 1 ? 's' : ''}</div>
                                                        </div>
                                                        <div className="text-amber-500 text-[10px] font-bold ml-2">
                                                            {isExpanded ? '▼' : '▶'}
                                                        </div>
                                                    </button>

                                                    {isExpanded && (
                                                        <div className="p-2.5 pt-0 border-t border-amber-100/50 bg-white/40 space-y-2 mt-2">
                                                            {group.reflections.map((ref: any, idx: number) => (
                                                                <div key={idx} className="text-[11px] text-amber-900 bg-white/80 p-2 rounded border border-amber-100 italic relative">
                                                                    "{ref.content}"
                                                                    <div className="text-[8px] text-amber-700/70 mt-1 font-semibold text-right">
                                                                        {new Date(ref.created_at).toLocaleDateString()}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {upcoming_checkpoints.length === 0 && (!recent_reflections || recent_reflections.length === 0) && (
                                <p className="text-amber-700/60 text-sm">No recent reflections or checkpoints due soon.</p>
                            )}
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
};

export default StudentDashboard;
