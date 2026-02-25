
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import { Task } from '../../types';
import { Save, CheckCircle, ArrowLeft } from 'lucide-react';
import { ReviewerChecklist } from '../../components/feedback/ReviewerChecklist';
import { useToast } from '../../contexts/ToastContext';

interface ReviewData {
    assignment: any;
    task: Task | null;
    attachments: any[];
}

const PeerReviewWorkspace: React.FC = () => {
    const { assignmentId } = useParams<{ assignmentId: string }>();
    const navigate = useNavigate();
    const [data, setData] = useState<ReviewData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { addToast } = useToast();

    // Task Selection for Orphaned Assignments
    const [revieweeTasks, setRevieweeTasks] = useState<Task[]>([]);
    const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);

    // Form State
    const [warmFeedback, setWarmFeedback] = useState('');
    const [coolFeedback, setCoolFeedback] = useState('');
    const [requiresRevision, setRequiresRevision] = useState(false);
    const [rating, setRating] = useState(5);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [checklistConfirmed, setChecklistConfirmed] = useState(false);

    // Auto-save logic (simple localStorage)
    useEffect(() => {
        const saved = localStorage.getItem(`review_draft_${assignmentId}`);
        if (saved) {
            const parsed = JSON.parse(saved);
            setWarmFeedback(parsed.warm || '');
            setCoolFeedback(parsed.cool || '');
            setRequiresRevision(parsed.revision || false);
        }
    }, [assignmentId]);

    useEffect(() => {
        if (assignmentId) {
            const draft = { warm: warmFeedback, cool: coolFeedback, revision: requiresRevision };
            localStorage.setItem(`review_draft_${assignmentId}`, JSON.stringify(draft));
        }
    }, [warmFeedback, coolFeedback, requiresRevision, assignmentId]);

    useEffect(() => {
        api.get<any>(`/peer-reviews/${assignmentId}`)
            .then(res => {
                setData(res);
                if (res.task) {
                    setSelectedTaskId(res.task.id);
                } else {
                    // Fetch tasks for the project to allow selection
                    if (res.assignment && res.assignment.project_id) {
                        api.get<Task[]>(`/projects/${res.assignment.project_id}/tasks`)
                            .then(tasks => setRevieweeTasks(tasks))
                            .catch(e => console.error("Failed to fetch project tasks", e));
                    }
                }

                // If submitted feedback exists, populate and set read-only
                if (res.feedback) {
                    setWarmFeedback(res.feedback.warm_feedback || '');
                    setCoolFeedback(res.feedback.cool_feedback || '');
                    setRequiresRevision(res.feedback.requires_revision || false);
                    setChecklistConfirmed(res.feedback.checklist_confirmed || true);
                    // Disable submission
                    setIsSubmitting(true); // Hacky way to disable button, or add isReadOnly state
                }
            })
            .catch(err => {
                console.error(err);
                setError("Failed to load review workspace. You might not be the assigned reviewer.");
            })
            .finally(() => setLoading(false));
    }, [assignmentId]);

    const isReadOnly = data?.assignment?.status === 'completed';

    const handleSubmit = async () => {
        if (!warmFeedback && !coolFeedback) {
            addToast("Please provide some feedback.", 'warning');
            return;
        }

        // Ensure a task is selected or present
        const finalTaskId = selectedTaskId || data?.task?.id;
        if (!finalTaskId) {
            addToast("Please select a task to review.", 'warning');
            return;
        }

        if (!checklistConfirmed) {
            addToast("Please complete the Quality Checklist first.", 'warning');
            return;
        }

        setIsSubmitting(true);
        try {
            await api.post(`/peer-reviews/${assignmentId}/submit`, {
                content: `Warm: ${warmFeedback}\nCool: ${coolFeedback}`,
                rating,
                warm_feedback: warmFeedback,
                cool_feedback: coolFeedback,
                requires_revision: requiresRevision,
                task_id: finalTaskId,
                checklist_confirmed: true
            });
            // Clear draft
            localStorage.removeItem(`review_draft_${assignmentId}`);
            addToast("Critique submitted successfully!", 'success');
            navigate('/student/today');
        } catch (err) {
            console.error(err);
            addToast("Failed to submit review.", 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) return <div className="p-8 text-center text-gray-500">Loading Workspace...</div>;
    if (error) return <div className="p-8 text-center text-red-500">{error}</div>;
    if (!data) return null;

    return (
        <div className="flex h-[calc(100vh-64px)] overflow-hidden">
            {/* Left Pane: The Work */}
            <div className="w-1/2 border-r border-gray-200 overflow-y-auto bg-gray-50 p-8">
                <button onClick={() => navigate('/student/today')} className="mb-4 text-gray-500 hover:text-gray-700 flex items-center text-sm">
                    <ArrowLeft className="w-4 h-4 mr-1" /> Back to Dashboard
                </button>

                <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200">
                    <div className="mb-6">
                        <h1 className="text-2xl font-bold text-gray-900">{data.task?.title || 'General Review'}</h1>
                        <p className="text-sm text-gray-500">By {data.assignment.reviewee_name}</p>
                    </div>

                    {!data.task && revieweeTasks.length > 0 && (
                        <div className="mb-6 p-4 bg-yellow-50 rounded-lg border border-yellow-100">
                            <label className="block text-sm font-medium text-yellow-800 mb-2">Select Task to Review</label>
                            <p className="text-xs text-yellow-600 mb-2">This review wasn't linked to a specific task. Please choose one.</p>
                            <select
                                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                value={selectedTaskId || ''}
                                onChange={e => setSelectedTaskId(Number(e.target.value))}
                            >
                                <option value="">-- Select a task --</option>
                                {revieweeTasks.map(t => (
                                    <option key={t.id} value={t.id}>{t.title}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div className="prose max-w-none mb-6">
                        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">Description / Content</h3>
                        <div dangerouslySetInnerHTML={{ __html: data.task?.description || '<p class="italic text-gray-400">No description provided.</p>' }} />
                    </div>

                    {data.attachments && data.attachments.length > 0 && (
                        <div className="mt-8 pt-6 border-t border-gray-100">
                            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Attachments</h3>
                            <ul className="space-y-2">
                                {data.attachments.map((file: any) => (
                                    <li key={file.id} className="flex items-center p-3 bg-gray-50 rounded-lg border border-gray-200">
                                        <span className="text-sm text-gray-700 truncate flex-1">{file.filename || 'Untitled File'}</span>
                                        <a href={file.url} target="_blank" rel="noreferrer" className="text-xs text-indigo-600 hover:underline">View</a>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            </div>

            {/* Right Pane: The Critique */}
            <div className="w-1/2 overflow-y-auto bg-white p-8">
                <div className="max-w-2xl mx-auto">
                    <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
                        <CheckCircle className="w-6 h-6 mr-2 text-indigo-600" />
                        Peer Critique
                    </h2>

                    <div className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Warm Feedback (Strengths) 🌟</label>
                            <textarea
                                value={warmFeedback}
                                onChange={e => setWarmFeedback(e.target.value)}
                                readOnly={isReadOnly}
                                className={`w-full h-32 p-4 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none transition-shadow ${isReadOnly ? 'bg-gray-50 text-gray-500' : ''}`}
                                placeholder="What did they do well? Be specific!"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Cool Feedback (Growth) 🧊</label>
                            <textarea
                                value={coolFeedback}
                                onChange={e => setCoolFeedback(e.target.value)}
                                readOnly={isReadOnly}
                                className={`w-full h-32 p-4 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none transition-shadow ${isReadOnly ? 'bg-gray-50 text-gray-500' : ''}`}
                                placeholder="What questions do you have? What could be improved?"
                            />
                        </div>

                        <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                            <label className="flex items-center gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={requiresRevision}
                                    onChange={e => setRequiresRevision(e.target.checked)}
                                    className="w-5 h-5 text-yellow-600 rounded focus:ring-yellow-500 border-gray-300"
                                />
                                <div>
                                    <span className="font-medium text-yellow-900">Requires Revision?</span>
                                    <p className="text-xs text-yellow-700 mt-1">If checked, this task will be moved back to "In Progress".</p>
                                </div>
                            </label>
                        </div>

                        <div className={isReadOnly ? 'pointer-events-none opacity-75' : ''}>
                            <ReviewerChecklist onComplete={setChecklistConfirmed} />
                        </div>

                        {!isReadOnly && (
                            <div className="pt-4 flex items-center justify-between">
                                <span className="text-xs text-gray-400 flex items-center">
                                    <Save className="w-3 h-3 mr-1" /> Draft saved automatically
                                </span>
                                <button
                                    onClick={handleSubmit}
                                    disabled={isSubmitting || !checklistConfirmed}
                                    className={`px-6 py-2 bg-indigo-600 text-white rounded-lg font-medium shadow-sm hover:bg-indigo-700 transition-colors ${isSubmitting || !checklistConfirmed ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    {isSubmitting ? 'Submitting...' : 'Submit Critique'}
                                </button>
                            </div>
                        )}
                        {isReadOnly && (
                            <div className="pt-4 text-center">
                                <span className="inline-flex items-center px-4 py-2 rounded-full bg-green-100 text-green-800 text-sm font-medium">
                                    <CheckCircle className="w-4 h-4 mr-2" />
                                    Submitted
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            </div >
        </div >
    );
};

export default PeerReviewWorkspace;
