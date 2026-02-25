
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { Circle, Clock, AlertCircle, MessageSquare, Lock, PartyPopper } from 'lucide-react';

interface DashboardData {
    next_tasks: any[];
    pending_reviews: any[];
    upcoming_checkpoints: any[];
}

const StudentToday: React.FC = () => {
    const [data, setData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        document.title = "Mission Control | PBL Manager";
        api.get<DashboardData>('/student/dashboard')
            .then(data => setData(data))
            .catch(err => console.error(err))
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <div className="p-8 text-center">Loading Mission Control...</div>;
    if (!data) return <div className="p-8 text-center text-red-500">Failed to load dashboard.</div>;

    const { next_tasks, pending_reviews, upcoming_checkpoints } = data;

    return (
        <div className="max-w-5xl mx-auto">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Mission Control 🚀</h1>
            <p className="text-gray-500 mb-8">Your focused agenda for today.</p>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Focus: Top 3 Tasks */}
                <div className="lg:col-span-2 space-y-8">
                    <section>
                        <h2 className="flex items-center text-xl font-bold text-gray-800 mb-4">
                            <Clock className="w-6 h-6 mr-2 text-indigo-600" />
                            Next Steps
                        </h2>

                        <div className="space-y-4">
                            {next_tasks.length === 0 ? (
                                <div className="p-10 text-center bg-gray-50 rounded-xl border border-dashed border-gray-300 text-gray-500">
                                    <PartyPopper className="w-10 h-10 mx-auto mb-3 text-yellow-500" />
                                    <p className="font-medium">All caught up!</p>
                                    <p className="text-sm">Check the backlog or ask your Scrum Master for more.</p>
                                </div>
                            ) : (
                                next_tasks.map(task => (
                                    <div key={task.id} className={`bg-white p-6 rounded-xl border shadow-sm flex items-start gap-4 transition-all hover:shadow-md ${Number(task.blocker_count) > 0 ? 'border-red-200 bg-red-50/30' : 'border-gray-200'}`}>
                                        {Number(task.blocker_count) > 0 ? (
                                            <div className="mt-1 text-red-400" title="Blocked">
                                                <Lock className="w-6 h-6" />
                                            </div>
                                        ) : (
                                            <button className="mt-1 text-gray-300 hover:text-green-600 transition-colors">
                                                <Circle className="w-6 h-6" />
                                            </button>
                                        )}

                                        <div className="flex-1">
                                            <div className="flex justify-between items-start">
                                                <h3 className="text-lg font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors">
                                                    <Link to={`/projects/${task.project_id}?task=${task.id}`}>
                                                        {task.title}
                                                    </Link>
                                                </h3>
                                                <Link to={`/projects/${task.project_id}`} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded hover:bg-gray-200">
                                                    {task.project_title}
                                                </Link>
                                            </div>
                                            <p className="text-gray-600 mt-1">{task.description || 'No description'}</p>

                                            {Number(task.blocker_count) > 0 && (
                                                <div className="mt-3 flex items-center gap-2 text-sm text-red-600 bg-red-50 px-3 py-1.5 rounded-lg w-fit">
                                                    <Lock className="w-3 h-3" />
                                                    <span>Blocked by: {task.blockers?.join(', ') || 'Unknown Task'}</span>
                                                </div>
                                            )}

                                            <div className="mt-4 flex items-center gap-3">
                                                {task.due_date && (
                                                    <span className={`text-xs font-medium px-2 py-1 rounded ${new Date(task.due_date) < new Date() ? 'bg-red-100 text-red-700' : 'bg-green-50 text-green-700'}`}>
                                                        Due: {new Date(task.due_date).toLocaleDateString()}
                                                    </span>
                                                )}
                                                {/* <button className="text-xs text-indigo-600 hover:underline">View Details</button> */}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </section>
                </div>

                {/* Sidebar: Reviews & Reflections */}
                <div className="space-y-8">
                    {/* Peer Reviews */}
                    <section className="bg-white p-6 rounded-xl border border-indigo-100 shadow-sm relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-20 h-20 bg-indigo-50 rounded-full -mr-10 -mt-10 blur-xl"></div>
                        <h2 className="flex items-center text-lg font-bold text-gray-900 mb-4 relative z-10">
                            <MessageSquare className="w-5 h-5 mr-2 text-indigo-600" />
                            Peer Critiques
                        </h2>

                        {pending_reviews.length === 0 ? (
                            <p className="text-gray-400 text-sm italic">No reviews pending. You're a good citizen! 🌟</p>
                        ) : (
                            <div className="space-y-3 relative z-10">
                                {pending_reviews.map(review => (
                                    <div key={review.id} className="bg-indigo-50 p-4 rounded-lg border border-indigo-100">
                                        <p className="text-sm font-medium text-indigo-900">Review {review.reviewee_name}'s work</p>
                                        <p className="text-xs text-indigo-600 mb-3">Project: {review.project_title}</p>
                                        <Link
                                            to={`/student/reviews/${review.id}`}
                                            className="block w-full text-center py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm"
                                        >
                                            Start Critique
                                        </Link>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>

                    {/* Checkpoints & Reflections */}
                    <section className="bg-amber-50 p-6 rounded-xl border border-amber-100 shadow-sm">
                        <h2 className="flex items-center text-lg font-bold text-amber-900 mb-4">
                            <AlertCircle className="w-5 h-5 mr-2 text-amber-600" />
                            Reflections
                        </h2>

                        {upcoming_checkpoints.length === 0 ? (
                            <p className="text-amber-700/60 text-sm italic">Clear sailing ahead! ⛵</p>
                        ) : (
                            <div className="space-y-4">
                                {upcoming_checkpoints.map((cp, idx) => (
                                    <div key={idx} className="bg-white/60 p-4 rounded-lg border border-amber-200/50">
                                        <h4 className="font-semibold text-amber-900 text-sm">{cp.title}</h4>
                                        <p className="text-xs text-amber-800 mt-1">Due: {new Date(cp.due_date).toLocaleDateString()}</p>
                                        <button className="mt-3 w-full py-2 bg-amber-500 text-white rounded-md text-sm font-medium hover:bg-amber-600 transition-colors shadow-sm">
                                            Write Reflection
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>
                </div>
            </div>

        </div>
    );
};

export default StudentToday;
