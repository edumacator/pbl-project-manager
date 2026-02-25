import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { Checkpoint } from '../types';
import { X, Plus, Calendar, Trash2 } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';

interface ClassMilestonesModalProps {
    classId: number;
    className: string;
    isOpen: boolean;
    onClose: () => void;
}

export const ClassMilestonesModal: React.FC<ClassMilestonesModalProps> = ({ classId, className, isOpen, onClose }) => {
    const [milestones, setMilestones] = useState<Checkpoint[]>([]);
    const [loading, setLoading] = useState(true);
    const [newTitle, setNewTitle] = useState('');
    const [newDate, setNewDate] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const { addToast } = useToast();

    // Add endpoint for GET milestones (currently we rely on getTimeline for teams, but for class management we might need a dedicated GET)
    // Actually, we didn't add a GET /api/v1/classes/:id/milestones route yet!
    // We only added POST.
    // Let's add GET logic to fetch milestones. We can reuse TimelineService or CheckpointRepo logic.
    // For now, let's assume we can fetch them via a new endpoint or update index.php.
    // Wait, TimelineService merges them.
    // I should probably add GET /api/v1/classes/:id/milestones to index.php first to list them here.

    // Correction: I will add the GET endpoint logic to index.php in the next step if I missed it.
    // Checking index.php edits... I only added POST.
    // I need to add GET handling to that route block.

    const fetchMilestones = async () => {
        setLoading(true);
        try {
            const res = await api.get<Checkpoint[]>(`/classes/${classId}/milestones`);
            setMilestones(res || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            fetchMilestones();
        }
    }, [isOpen, classId]);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTitle) return;

        setSubmitting(true);
        try {
            await api.post(`/classes/${classId}/milestones`, {
                title: newTitle,
                due_date: newDate || null,
            });
            setNewTitle('');
            setNewDate('');
            fetchMilestones();
            addToast('Milestone created', 'success');
        } catch (err) {
            console.error(err);
            addToast('Failed to create milestone', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <h2 className="font-semibold text-gray-800">
                        Class Milestones: <span className="text-indigo-600">{className}</span>
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-4 border-b border-gray-100 bg-gray-50/50">
                    <form onSubmit={handleCreate} className="flex flex-col gap-3">
                        <div>
                            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">New Milestone</label>
                            <input
                                type="text"
                                placeholder="e.g. Rough Draft Due"
                                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                value={newTitle}
                                onChange={e => setNewTitle(e.target.value)}
                                required
                            />
                        </div>
                        <div className="flex gap-3">
                            <div className="flex-1">
                                <input
                                    type="date"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                    value={newDate}
                                    onChange={e => setNewDate(e.target.value)}
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={submitting}
                                className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 flex items-center"
                            >
                                <Plus className="w-4 h-4 mr-1" /> Add
                            </button>
                        </div>
                    </form>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {loading ? (
                        <div className="text-center text-gray-500 py-4">Loading...</div>
                    ) : milestones.length === 0 ? (
                        <div className="text-center text-gray-400 py-8 italic">No milestones set for this class.</div>
                    ) : (
                        milestones.map(m => (
                            <div key={m.id} className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg shadow-sm">
                                <div>
                                    <div className="font-medium text-gray-900">{m.title}</div>
                                    {m.due_date && (
                                        <div className="flex items-center text-xs text-gray-500 mt-0.5">
                                            <Calendar className="w-3 h-3 mr-1" />
                                            {new Date(m.due_date).toLocaleDateString()}
                                        </div>
                                    )}
                                </div>
                                {/* 
                                   TODO: Add delete functionality.
                                   We need a DELETE endpoint. 
                                */}
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};
