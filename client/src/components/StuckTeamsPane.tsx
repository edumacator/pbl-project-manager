import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { AlertTriangle, CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

interface StuckTeam {
    team_id: number;
    team_name: string;
    project_title: string;
    project_id: number;
    overdue_tasks: number;
    stale_tasks: number;
}

const StuckTeamsPane: React.FC = () => {
    const [teams, setTeams] = useState<StuckTeam[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get<StuckTeam[]>('/analytics/stuck-teams')
            .then(data => setTeams(data || []))
            .catch(err => console.error(err))
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <div className="p-4 text-gray-500">Loading stuck teams...</div>;

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col h-full">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                <h3 className="font-semibold text-gray-900">Stuck Teams</h3>
                <span className="bg-amber-100 text-amber-800 text-xs px-2 py-1 rounded-full">{teams.length}</span>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3 relative">
                {teams.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                        <CheckCircle className="w-8 h-8 mx-auto text-green-500 mb-2" />
                        <p>All teams are moving smoothly!</p>
                    </div>
                ) : (
                    teams.map(t => (
                        <div key={t.team_id} className="flex flex-col p-3 bg-amber-50 rounded-lg border border-amber-100 hover:shadow-sm transition-shadow">
                            <div className="flex items-start">
                                <AlertTriangle className="w-5 h-5 text-amber-500 mr-3 mt-0.5 shrink-0" />
                                <div className="flex-1">
                                    <h4 className="font-semibold text-gray-900 leading-tight">{t.team_name}</h4>
                                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{t.project_title}</p>

                                    <div className="mt-2 flex gap-2">
                                        {t.overdue_tasks > 0 && (
                                            <span className="inline-flex items-center px-2 text-[10px] font-bold tracking-wide rounded-sm bg-red-100 text-red-700 uppercase">
                                                {t.overdue_tasks} Overdue
                                            </span>
                                        )}
                                        {t.stale_tasks > 0 && (
                                            <span className="inline-flex items-center px-2 text-[10px] font-bold tracking-wide rounded-sm bg-amber-200 text-amber-800 uppercase">
                                                {t.stale_tasks} Stale
                                            </span>
                                        )}
                                    </div>

                                    <div className="mt-3 text-right">
                                        <Link
                                            to={`/projects/${t.project_id}`}
                                            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                                        >
                                            View Board &rarr;
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default StuckTeamsPane;
