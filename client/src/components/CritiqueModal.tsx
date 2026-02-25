import React, { useState } from 'react';

interface CritiqueModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (warm: string, cool: string, requiresRevision: boolean) => Promise<void>;
    taskTitle: string;
}

export const CritiqueModal: React.FC<CritiqueModalProps> = ({ isOpen, onClose, onSubmit, taskTitle }) => {
    const [warm, setWarm] = useState('');
    const [cool, setCool] = useState('');
    const [requiresRevision, setRequiresRevision] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async () => {
        setIsSubmitting(true);
        try {
            await onSubmit(warm, cool, requiresRevision);
            onClose();
        } catch (error) {
            console.error("Failed to submit critique", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
            <div className="relative mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-gray-900">Peer Critique: {taskTitle}</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
                        <span className="text-2xl">&times;</span>
                    </button>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                        <label className="block text-sm font-medium text-amber-700 mb-1">
                            Warm Feedback <span className="text-amber-500">(Glows)</span>
                        </label>
                        <p className="text-xs text-gray-500 mb-2">Specific praise about what is working well.</p>
                        <textarea
                            className="w-full h-32 p-2 border border-amber-200 rounded-md focus:ring-amber-500 focus:border-amber-500"
                            placeholder="I really like how you..."
                            value={warm}
                            onChange={(e) => setWarm(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-blue-700 mb-1">
                            Cool Feedback <span className="text-blue-500">(Grows)</span>
                        </label>
                        <p className="text-xs text-gray-500 mb-2">Specific suggestions for improvement.</p>
                        <textarea
                            className="w-full h-32 p-2 border border-blue-200 rounded-md focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Have you considered..."
                            value={cool}
                            onChange={(e) => setCool(e.target.value)}
                        />
                    </div>
                </div>

                <div className="mb-6 bg-red-50 p-4 rounded-md border border-red-100">
                    <div className="flex items-start">
                        <div className="flex items-center h-5">
                            <input
                                id="requires_revision"
                                type="checkbox"
                                checked={requiresRevision}
                                onChange={(e) => setRequiresRevision(e.target.checked)}
                                className="focus:ring-red-500 h-4 w-4 text-red-600 border-gray-300 rounded"
                            />
                        </div>
                        <div className="ml-3 text-sm">
                            <label htmlFor="requires_revision" className="font-medium text-red-700">Requires Revision</label>
                            <p className="text-red-500">Check this if the work is not yet ready for "Done" status. The task will be moved back to "In Progress".</p>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
                        disabled={isSubmitting}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={isSubmitting || (!warm && !cool)}
                        className={`px-4 py-2 text-white rounded-md ${(warm || cool) && !isSubmitting
                                ? 'bg-indigo-600 hover:bg-indigo-700'
                                : 'bg-indigo-300 cursor-not-allowed'
                            }`}
                    >
                        {isSubmitting ? 'Submitting...' : 'Submit Critique'}
                    </button>
                </div>
            </div>
        </div>
    );
};
