import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { X, CheckCircle, Clock } from 'lucide-react';

interface Contribution {
    user_id: number;
    name: string;
    total_assigned: number;
    completed_tasks: number;
    in_progress_tasks: number;
}

interface TeamContributionsModalProps {
    teamId: number;
    teamName: string;
    isOpen: boolean;
    onClose: () => void;
}

export const TeamContributionsModal: React.FC<TeamContributionsModalProps> = ({ teamId, teamName, isOpen, onClose }) => {
    const [contributions, setContributions] = useState<Contribution[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            setLoading(true);
            setError(null);
            api.get<Contribution[]>(`/teams/${teamId}/contributions`)
                .then(data => setContributions(data || []))
                .catch(err => setError(err.message || 'Failed to load contributions'))
                .finally(() => setLoading(false));
        }
    }, [isOpen, teamId]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-xl max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]">
                <div className="flex justify-between items-center p-5 border-b border-gray-100 bg-gray-50 shrink-0">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900">Team Contributions</h2>
                        <p className="text-sm text-gray-500">{teamName}</p>
                    </div>
                    <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto flex-1">
                    {loading ? (
                        <div className="text-center py-8 text-gray-500">Loading contribution data...</div>
                    ) : error ? (
                        <div className="text-center py-8 text-red-500">{error}</div>
                    ) : contributions.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">No task data found for this team.</div>
                    ) : (
                        <div className="space-y-4">
                            {contributions.map(c => {
                                const completionPercent = c.total_assigned > 0 ? Math.round((c.completed_tasks / c.total_assigned) * 100) : 0;

                                return (
                                    <div key={c.user_id} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                                        <div className="flex justify-between items-center mb-3">
                                            <h3 className="font-semibold text-gray-900">{c.name}</h3>
                                            <div className="text-sm font-medium text-gray-500">
                                                {c.total_assigned} Total Tasks
                                            </div>
                                        </div>

                                        <div className="flex gap-4 mb-4">
                                            <div className="flex items-center text-sm">
                                                <CheckCircle className="w-4 h-4 text-green-500 mr-1.5" />
                                                <span className="font-medium text-gray-700">{c.completed_tasks}</span>
                                                <span className="text-gray-400 ml-1">Done</span>
                                            </div>
                                            <div className="flex items-center text-sm">
                                                <Clock className="w-4 h-4 text-amber-500 mr-1.5" />
                                                <span className="font-medium text-gray-700">{c.in_progress_tasks}</span>
                                                <span className="text-gray-400 ml-1">Doing</span>
                                            </div>
                                        </div>

                                        <div className="relative pt-1">
                                            <div className="flex mb-2 items-center justify-between">
                                                <div>
                                                    <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-indigo-600 bg-indigo-50">
                                                        Completion
                                                    </span>
                                                </div>
                                                <div className="text-right">
                                                    <span className="text-xs font-semibold inline-block text-indigo-600">
                                                        {completionPercent}%
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="overflow-hidden h-2 mb-4 text-xs flex rounded-full bg-indigo-50">
                                                <div style={{ width: `${completionPercent}%` }} className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-indigo-500 transition-all duration-500"></div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
