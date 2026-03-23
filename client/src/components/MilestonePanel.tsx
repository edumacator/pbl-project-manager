import React from 'react';
import { Checkpoint } from '../types';
import { Calendar, MessageSquare, Star, Clock } from 'lucide-react';

interface MilestonePanelProps {
    checkpoints: Checkpoint[];
    requiresReflection: boolean;
    requireCritique: boolean;
    loading?: boolean;
}

export const MilestonePanel: React.FC<MilestonePanelProps> = ({ 
    checkpoints, 
    requiresReflection, 
    requireCritique,
    loading = false
}) => {
    if (loading) {
        return (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col items-center justify-center min-h-[200px]">
                <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-3"></div>
                <p className="text-sm text-gray-500">Loading milestones...</p>
            </div>
        );
    }

    if (checkpoints.length === 0) {
        return (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
                <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Calendar className="w-6 h-6 text-gray-300" />
                </div>
                <h3 className="text-sm font-semibold text-gray-900">No Milestones Set</h3>
                <p className="text-xs text-gray-500 mt-1">This project doesn't have any milestones configured yet.</p>
            </div>
        );
    }

    const sortedCheckpoints = [...checkpoints].sort((a, b) => {
        if (!a.due_date) return 1;
        if (!b.due_date) return -1;
        return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
    });

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-5 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                <h3 className="font-semibold text-gray-900 text-lg">Project Milestones</h3>
            </div>
            
            <div className="divide-y divide-gray-100">
                {sortedCheckpoints.map((cp) => (
                    <div key={cp.id} className="p-5 hover:bg-gray-50 transition-colors">
                        <div className="flex justify-between items-start gap-4 mb-3">
                            <div>
                                <h4 className="font-bold text-gray-900 leading-tight">{cp.title}</h4>
                                {cp.due_date && (
                                    <div className="flex items-center gap-1.5 text-xs text-indigo-600 font-medium mt-1">
                                        <Clock className="w-3.5 h-3.5" />
                                        Due {new Date(cp.due_date).toLocaleDateString(undefined, { 
                                            month: 'short', 
                                            day: 'numeric',
                                            year: 'numeric'
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                            {requiresReflection && (
                                <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-50 text-amber-700 rounded text-[10px] font-bold border border-amber-100">
                                    <MessageSquare className="w-3 h-3" />
                                    REFLECTION REQUIRED
                                </span>
                            )}
                            {requireCritique && (
                                <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded text-[10px] font-bold border border-blue-100">
                                    <Star className="w-3 h-3" />
                                    CRITIQUE OPTION
                                </span>
                            )}
                            {!requiresReflection && !requireCritique && (
                                <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">No specific requirements</span>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
