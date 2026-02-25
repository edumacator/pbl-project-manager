import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { AlertCircle, CheckCircle } from 'lucide-react';

interface AtRiskStudent {
    student_id: number;
    name: string;
    overdue_count: number;
    project_id?: number;
}

const StudentActivityPane: React.FC = () => {
    const [students, setStudents] = useState<AtRiskStudent[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get<AtRiskStudent[]>('/analytics/at-risk')
            .then(data => setStudents(data || []))
            .catch(err => console.error(err))
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <div className="p-4 text-gray-500">Loading activity...</div>;

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col h-full">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                <h3 className="font-semibold text-gray-900">Student Needs Attention</h3>
                <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full">{students.length}</span>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {students.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                        <CheckCircle className="w-8 h-8 mx-auto text-green-500 mb-2" />
                        <p>All students are on track!</p>
                    </div>
                ) : (
                    students.map(s => (
                        <div key={s.student_id} className="flex items-start p-3 bg-red-50 rounded-lg border border-red-100">
                            <AlertCircle className="w-5 h-5 text-red-500 mr-3 mt-0.5" />
                            <div>
                                <p className="font-medium text-gray-900">{s.name}</p>
                                <p className="text-sm text-red-700">{s.overdue_count} overdue tasks</p>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default StudentActivityPane;
