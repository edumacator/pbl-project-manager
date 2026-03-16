import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { AlertCircle, CheckCircle } from 'lucide-react';

interface AtRiskStudent {
    student_id: number;
    name: string;
    overdue_count: number;
    project_id: number;
    project_title: string;
    class_id: number;
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
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col h-full overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
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
                    students.map((s, idx) => (
                        <div key={`${s.student_id}-${s.project_id}-${idx}`} className="p-4 bg-red-50 rounded-lg border border-red-100 hover:shadow-sm transition-shadow">
                            <div className="flex items-start mb-3">
                                <AlertCircle className="w-5 h-5 text-red-500 mr-3 mt-0.5 shrink-0" />
                                <div>
                                    <p className="font-bold text-gray-900 leading-tight">{s.name}</p>
                                    <p className="text-sm text-red-700 mt-1">
                                        <span className="font-bold">{s.overdue_count}</span> overdue in <span className="italic">"{s.project_title}"</span>
                                    </p>
                                </div>
                            </div>
                            <Link 
                                to={`/teacher/student-detail?student_id=${s.student_id}&project_id=${s.project_id}&class_id=${s.class_id}`}
                                className="block w-full text-center py-1.5 bg-white text-indigo-700 border border-indigo-200 rounded-md text-sm font-semibold hover:bg-indigo-50 transition-colors"
                            >
                                Help Student
                            </Link>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default StudentActivityPane;
