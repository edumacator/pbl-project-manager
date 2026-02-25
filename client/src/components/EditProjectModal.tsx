import React, { useState, useEffect } from 'react';
import { Project, Class } from '../types';
import { X, Save, Calendar, BookOpen } from 'lucide-react';
import { api } from '../api/client';
import { useToast } from '../contexts/ToastContext';

interface EditProjectModalProps {
    project: Project;
    isOpen: boolean;
    onClose: () => void;
    onProjectUpdated: (project: Project) => void;
}

export const EditProjectModal: React.FC<EditProjectModalProps> = ({ project, isOpen, onClose, onProjectUpdated }) => {
    const [title, setTitle] = useState(project.title);
    const [drivingQuestion, setDrivingQuestion] = useState(project.driving_question);
    const [description, setDescription] = useState(project.description || '');
    const [dueDate, setDueDate] = useState(project.due_date || '');
    // Classes
    const [availableClasses, setAvailableClasses] = useState<Class[]>([]);
    const [selectedClassIds, setSelectedClassIds] = useState<number[]>([]);

    const [loading, setLoading] = useState(false);
    const { addToast } = useToast();

    useEffect(() => {
        if (isOpen) {
            setTitle(project.title);
            setDrivingQuestion(project.driving_question);
            setDescription(project.description || '');
            setDueDate(project.due_date ? project.due_date.split(' ')[0] : ''); // Format YYYY-MM-DD

            // Initial selected classes
            if (project.classes) {
                setSelectedClassIds(project.classes.map(c => c.id));
            } else {
                setSelectedClassIds([]);
            }

            // Fetch available classes
            fetchClasses();
        }
    }, [isOpen, project]);

    const fetchClasses = async () => {
        try {
            const data = await api.get<Class[]>('/classes');
            setAvailableClasses(data || []);
        } catch (err) {
            console.error("Failed to fetch classes", err);
        }
    };

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const updated = await api.patch<{ project: Project }>(`/projects/${project.id}`, {
                title,
                driving_question: drivingQuestion,
                description,
                due_date: dueDate || null,
                class_ids: selectedClassIds
            });
            window.dispatchEvent(new CustomEvent('projects-changed'));
            onProjectUpdated(updated.project);
            onClose();
            addToast('Project updated successfully', 'success');
        } catch (err) {
            console.error(err);
            addToast('Failed to update project', 'error');
        } finally {
            setLoading(false);
        }
    };

    const toggleClass = (classId: number) => {
        setSelectedClassIds(prev =>
            prev.includes(classId)
                ? prev.filter(id => id !== classId)
                : [...prev, classId]
        );
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <h3 className="font-semibold text-gray-900">Edit Project</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Project Title <span className="text-red-500">*</span></label>
                        <input
                            type="text"
                            required
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Driving Question <span className="text-red-500">*</span></label>
                        <p className="text-xs text-gray-500 mb-1">The central question that guides the project and engages students.</p>
                        <input
                            type="text"
                            required
                            value={drivingQuestion}
                            onChange={e => setDrivingQuestion(e.target.value)}
                            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Description (Optional)</label>
                        <textarea
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            rows={3}
                            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                        />
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                        {/* Due Date */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                                <Calendar className="w-3 h-3" /> Due Date
                            </label>
                            <input
                                type="date"
                                value={dueDate}
                                onChange={e => setDueDate(e.target.value)}
                                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                            />
                        </div>

                        {/* Class Assignments */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                                <BookOpen className="w-3 h-3" /> Assign to Classes
                            </label>
                            <div className="border border-gray-200 rounded-lg p-3 max-h-40 overflow-y-auto space-y-2 bg-gray-50">
                                {availableClasses.length === 0 ? (
                                    <div className="text-gray-400 text-sm italic">No classes found.</div>
                                ) : (
                                    availableClasses.map(cls => (
                                        <label key={cls.id} className="flex items-center space-x-2 cursor-pointer hover:bg-gray-100 p-1 rounded">
                                            <input
                                                type="checkbox"
                                                checked={selectedClassIds.includes(cls.id)}
                                                onChange={() => toggleClass(cls.id)}
                                                className="rounded text-indigo-600 focus:ring-indigo-500 border-gray-300"
                                            />
                                            <span className="text-sm text-gray-700">{cls.name}</span>
                                        </label>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end pt-2 border-t border-gray-100 mt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg mr-2 text-sm font-medium transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors shadow-sm"
                        >
                            <Save className="w-4 h-4 mr-2" />
                            {loading ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
