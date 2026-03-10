import React, { useEffect, useState } from 'react';
import { api } from '../../api/client';
import {
    Users,
    FolderKanban,
    TrendingUp,
    ShieldAlert
} from 'lucide-react';

interface Stats {
    users: {
        total: number;
        teachers: number;
        students: number;
        admins: number;
    };
    projects: {
        total: number;
        active: number;
    };
}

const AdminOverview: React.FC = () => {
    const [stats, setStats] = useState<Stats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get<Stats>('/admin/stats')
            .then(data => setStats(data))
            .catch(err => console.error(err))
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <div>Loading statistics...</div>;

    const cards = [
        { label: 'Total Users', value: stats?.users.total, icon: Users, color: 'bg-blue-500' },
        { label: 'Teachers', value: stats?.users.teachers, icon: ShieldAlert, color: 'bg-purple-500' },
        { label: 'Students', value: stats?.users.students, icon: TrendingUp, color: 'bg-green-500' },
        { label: 'Active Projects', value: stats?.projects.active, icon: FolderKanban, color: 'bg-indigo-500' },
    ];

    return (
        <div>
            <header className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900">System Overview</h1>
                <p className="text-gray-500">Real-time platform metrics and usage.</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {cards.map((card) => (
                    <div key={card.label} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm transition-all hover:shadow-md">
                        <div className="flex items-center gap-4">
                            <div className={`${card.color} p-3 rounded-xl text-white`}>
                                <card.icon className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-gray-500">{card.label}</p>
                                <p className="text-2xl font-bold text-gray-900">{card.value}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm">
                    <h2 className="text-lg font-bold mb-4">User Distribution</h2>
                    <div className="space-y-4">
                        <DistributionBar label="Students" count={stats?.users.students || 0} total={stats?.users.total || 1} color="bg-green-500" />
                        <DistributionBar label="Teachers" count={stats?.users.teachers || 0} total={stats?.users.total || 1} color="bg-purple-500" />
                        <DistributionBar label="Admins" count={stats?.users.admins || 0} total={stats?.users.total || 1} color="bg-indigo-500" />
                    </div>
                </div>
            </div>
        </div>
    );
};

const DistributionBar: React.FC<{ label: string; count: number; total: number; color: string }> = ({ label, count, total, color }) => {
    const percentage = (count / total) * 100;
    return (
        <div>
            <div className="flex justify-between text-sm mb-1">
                <span className="font-medium text-gray-700">{label}</span>
                <span className="text-gray-500">{count} ({percentage.toFixed(1)}%)</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2">
                <div className={`${color} h-2 rounded-full`} style={{ width: `${percentage}%` }}></div>
            </div>
        </div>
    );
};

export default AdminOverview;
