import React from 'react';
import { TrendingUp, AlertTriangle, CheckCircle2 } from 'lucide-react';

export const AnalyticsSummary: React.FC = () => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-gray-500 text-sm font-medium">Sprint Velocity</h3>
                    <TrendingUp className="w-5 h-5 text-green-500" />
                </div>
                <div className="flex items-baseline">
                    <span className="text-2xl font-bold text-gray-900">12</span>
                    <span className="ml-2 text-sm text-green-600">+15%</span>
                </div>
                <p className="text-xs text-gray-400 mt-2">Tasks completed this week</p>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-gray-500 text-sm font-medium">Stuck Teams</h3>
                    <AlertTriangle className="w-5 h-5 text-red-500" />
                </div>
                <div className="flex items-baseline">
                    <span className="text-2xl font-bold text-gray-900">2</span>
                    <span className="ml-2 text-sm text-red-600">Action Needed</span>
                </div>
                <p className="text-xs text-gray-400 mt-2">No movement in &gt; 3 days</p>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-gray-500 text-sm font-medium">Checkpoint Status</h3>
                    <CheckCircle2 className="w-5 h-5 text-indigo-500" />
                </div>
                <div className="flex items-baseline">
                    <span className="text-2xl font-bold text-gray-900">85%</span>
                    <span className="ml-2 text-sm text-indigo-600">On Track</span>
                </div>
                <p className="text-xs text-gray-400 mt-2">Submission rate</p>
            </div>
        </div>
    );
};
