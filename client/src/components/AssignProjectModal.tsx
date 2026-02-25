import React, { useState, useEffect } from 'react';
import { Project } from '../types';
import { X, Plus, Check } from 'lucide-react';
import { api } from '../api/client';
import { Link } from 'react-router-dom';
import { useToast } from '../contexts/ToastContext';

interface AssignProjectModalProps {
    classId: number;
    currentProjects: Project[];
    isOpen: boolean;
    onClose: () => void;
    onProjectAssigned: () => void;
}

export const AssignProjectModal: React.FC<AssignProjectModalProps> = ({ classId, currentProjects, isOpen, onClose, onProjectAssigned }) => {
    const [availableProjects, setAvailableProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(false);
    const [assigningId, setAssigningId] = useState<number | null>(null);
    const { addToast } = useToast();

    useEffect(() => {
        if (isOpen) {
            fetchProjects();
        }
    }, [isOpen]);

    const fetchProjects = async () => {
        setLoading(true);
        try {
            const res = await api.get<{ projects: Project[] }>('/projects'); // Returns all projects
            const all = (res as any) || []; // Handle array response directly if applicable, but client usually wraps

            // Filter out projects that are ALREADY assigned to this class
            // Check if project.classes contains this classId OR if currentProjects has it
            const currentIds = new Set(currentProjects.map(p => p.id));

            const filtered = all.filter((p: Project) => {
                if (currentIds.has(p.id)) return false;
                // Also check embedded classes if available
                if (p.classes && p.classes.some(c => c.id === classId)) return false;
                return true;
            });

            setAvailableProjects(filtered);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleAssign = async (projectId: number) => {
        setAssigningId(projectId);
        try {
            await api.post(`/projects/${projectId}/assign`, { class_id: classId });
            onProjectAssigned();
            // Remove from list locally for immediate feedback
            setAvailableProjects(prev => prev.filter(p => p.id !== projectId));
            addToast('Project assigned successfully', 'success');
        } catch (err) {
            console.error(err);
            addToast("Failed to assign project", 'error');
        } finally {
            setAssigningId(null);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[80vh]">
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <h3 className="font-semibold text-gray-900">Assign Project to Class</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                    {loading ? (
                        <div className="text-center py-8 text-gray-400">Loading projects...</div>
                    ) : (
                        <div className="space-y-4">
                            {availableProjects.length === 0 ? (
                                <p className="text-center text-gray-500 py-4">No other projects available to assign.</p>
                            ) : (
                                availableProjects.map(project => (
                                    <div key={project.id} className="border border-gray-200 rounded-lg p-4 hover:border-indigo-300 transition-colors flex justify-between items-center bg-white">
                                        <div>
                                            <h4 className="font-medium text-gray-900">{project.title}</h4>
                                            <p className="text-xs text-gray-500 line-clamp-1">{project.driving_question}</p>
                                        </div>
                                        <button
                                            onClick={() => handleAssign(project.id)}
                                            disabled={assigningId === project.id}
                                            className="px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg text-sm font-medium hover:bg-indigo-100 disabled:opacity-50 transition-colors flex items-center"
                                        >
                                            {assigningId === project.id ? 'Assigning...' : 'Assign'}
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>

                <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end">
                    <Link
                        to={`/projects/new?class_id=${classId}`}
                        className="flex items-center text-sm font-medium text-indigo-600 hover:text-indigo-800"
                    >
                        <Plus className="w-4 h-4 mr-1" /> Create New Project instead
                    </Link>
                </div>
            </div>
        </div>
    );
};
