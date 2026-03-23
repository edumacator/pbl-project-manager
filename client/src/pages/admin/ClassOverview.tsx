import React, { useEffect, useState } from 'react';
import { api } from '../../api/client';
import {
    School,
    User,
    Calendar,
    Key,
    ExternalLink
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface ClassData {
    class: {
        id: number;
        name: string;
        staff_id: number;
        join_code: string;
        created_at: string;
    };
    teacher_name: string;
}

const ClassOverview: React.FC = () => {
    const [classes, setClasses] = useState<ClassData[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get<ClassData[]>('/admin/classes')
            .then(data => setClasses(data))
            .catch(err => console.error(err))
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <div>Loading classes...</div>;

    return (
        <div>
            <header className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900">Class Overview</h1>
                <p className="text-gray-500">A global view of all classes and their teachers.</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {classes.map(({ class: c, teacher_name }) => (
                    <div key={c.id} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all">
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600">
                                <School className="w-6 h-6" />
                            </div>
                            <Link
                                to={`/classes/${c.id}`}
                                className="p-2 text-gray-400 hover:text-indigo-600 transition-colors"
                                title="View Class Detail"
                            >
                                <ExternalLink className="w-5 h-5" />
                            </Link>
                        </div>

                        <h3 className="text-xl font-bold text-gray-900 mb-1">{c.name}</h3>

                        <div className="space-y-3 mt-4">
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                                <User className="w-4 h-4 text-gray-400" />
                                <span className="font-medium">Teacher:</span> {teacher_name}
                            </div>
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                                <Key className="w-4 h-4 text-gray-400" />
                                <span className="font-medium">Join Code:</span>
                                <span className="bg-gray-100 px-2 py-0.5 rounded font-mono font-bold text-indigo-600 uppercase">
                                    {c.join_code || 'NONE'}
                                </span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-gray-400 mt-4 pt-4 border-t border-gray-50">
                                <Calendar className="w-4 h-4 text-gray-300" />
                                Created: {new Date(c.created_at).toLocaleDateString()}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ClassOverview;
