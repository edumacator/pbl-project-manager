import React, { useState } from 'react';
import { api } from '../api/client';
import { Star, X } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';

interface PeerReviewModalProps {
    taskId: number;
    taskTitle: string;
    onClose: () => void;
}

export const PeerReviewModal: React.FC<PeerReviewModalProps> = ({ taskId, taskTitle, onClose }) => {
    const [rating, setRating] = useState(0);
    const [content, setContent] = useState('');
    const [loading, setLoading] = useState(false);
    const { addToast } = useToast();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await api.post(`/tasks/${taskId}/reviews`, {
                content,
                rating
            });
            onClose();
            addToast('Review submitted!', 'success');
        } catch (err) {
            console.error(err);
            addToast('Failed to submit review', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 relative">
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
                    <X className="w-5 h-5" />
                </button>

                <h2 className="text-xl font-bold text-gray-900 mb-1">Peer Review</h2>
                <p className="text-gray-500 text-sm mb-6">Reviewing: {taskTitle}</p>

                <form onSubmit={handleSubmit}>
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Rating</label>
                        <div className="flex gap-2">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                    key={star}
                                    type="button"
                                    onClick={() => setRating(star)}
                                    className={`p-1 rounded-full transition-colors ${rating >= star ? 'text-yellow-400' : 'text-gray-300'}`}
                                >
                                    <Star className="w-8 h-8 fill-current" />
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Feedback</label>
                        <textarea
                            value={content}
                            onChange={e => setContent(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 h-32 resize-none"
                            placeholder="What did they do well? What could be improved?"
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading || rating === 0}
                        className="w-full py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50"
                    >
                        {loading ? 'Submitting...' : 'Submit Review'}
                    </button>
                </form>
            </div>
        </div>
    );
};
