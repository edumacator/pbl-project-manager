import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { X, RefreshCw, Plus, Trash2 } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';

interface PeerReviewAssignment {
    id: number;
    project_id: number;
    reviewer_id: number;
    reviewee_id: number;
    task_id?: number;
    status: 'pending' | 'completed' | 'skipped';
    reviewer_name?: string;
    reviewee_name?: string;
    task_title?: string;
    created_at: string;
}

interface PeerAssignmentModalProps {
    isOpen: boolean;
    onClose: () => void;
    projectId: number;
}

const PeerAssignmentModal: React.FC<PeerAssignmentModalProps> = ({ isOpen, onClose, projectId }) => {
    const [assignments, setAssignments] = useState<PeerReviewAssignment[]>([]);
    const [loading, setLoading] = useState(false);
    const [generating, setGenerating] = useState(false);
    const { addToast } = useToast();

    useEffect(() => {
        if (isOpen) {
            loadAssignments();
        }
    }, [isOpen, projectId]);

    const loadAssignments = async () => {
        setLoading(true);
        try {
            const data = await api.get<PeerReviewAssignment[]>(`/projects/${projectId}/assignments`);
            setAssignments(data);
        } catch (e) {
            console.error("Failed to load assignments", e);
        } finally {
            setLoading(false);
        }
    };

    const handleAutoAssign = async () => {
        setGenerating(true);
        try {
            const res = await api.post<{ assignments: PeerReviewAssignment[], count: number }>(`/projects/${projectId}/assignments/auto`, {});
            // Reload all to get names if API didn't return them fully populated (it typically does)
            // But let's trust the response or reload.
            await loadAssignments();
            addToast(`Generated ${res.count} assignments.`, 'success');
        } catch (e) {
            console.error("Failed to auto-assign", e);
            addToast("Failed to generate assignments.", 'error');
        } finally {
            setGenerating(false);
        }
    };

    // Placeholder for manual create/delete if needed

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
                <div className="flex justify-between items-center p-6 border-b border-gray-100">
                    <div>
                        <h2 className="text-xl font-bold text-gray-800">Peer Assignments</h2>
                        <p className="text-sm text-gray-500">Manage who reviews whom.</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full text-gray-500">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 flex-1 overflow-y-auto">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-semibold text-gray-700">Current Assignments ({assignments.length})</h3>
                        <div className="space-x-2">
                            <button
                                onClick={handleAutoAssign}
                                disabled={generating}
                                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center disabled:opacity-50"
                            >
                                {generating ? <RefreshCw className="animate-spin w-4 h-4 mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                                Auto-Assign (Team Round Robin)
                            </button>
                        </div>
                    </div>

                    {loading ? (
                        <div className="text-center py-12 text-gray-400">Loading assignments...</div>
                    ) : assignments.length === 0 ? (
                        <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                            <p className="text-gray-500 mb-2">No active assignments found.</p>
                            <p className="text-sm text-gray-400">Click "Auto-Assign" to generate pairs within teams.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {assignments.map(a => (
                                <div key={a.id} className="bg-white border border-gray-200 p-4 rounded-lg flex justify-between items-center shadow-sm">
                                    <div className="flex items-center space-x-4">
                                        <div className="flex flex-col">
                                            <span className="text-xs text-gray-400 uppercase font-bold tracking-wider">Reviewer</span>
                                            <span className="font-medium text-gray-800">{a.reviewer_name || `User ${a.reviewer_id}`}</span>
                                        </div>
                                        <div className="text-gray-300">→</div>
                                        <div className="flex flex-col">
                                            <span className="text-xs text-gray-400 uppercase font-bold tracking-wider">Reviewee</span>
                                            <span className="font-medium text-gray-800">{a.reviewee_name || `User ${a.reviewee_id}`}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-3">
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${a.status === 'completed' ? 'bg-green-100 text-green-700' :
                                            a.status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'
                                            }`}>
                                            {a.status.replace('_', ' ')}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PeerAssignmentModal;
