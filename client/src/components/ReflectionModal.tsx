import React, { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';

interface ReflectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (content: string) => Promise<void>;
    onSkip: () => void;
    transitionType: 'start_work' | 'finish_task';
    taskTitle: string;
}

export const ReflectionModal: React.FC<ReflectionModalProps> = ({
    isOpen,
    onClose,
    onSubmit,
    onSkip,
    transitionType,
    taskTitle
}) => {
    const [content, setContent] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen) {
            setContent('');
            // Auto-focus after small delay to ensure modal is rendered
            setTimeout(() => {
                inputRef.current?.focus();
            }, 50);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const isStart = transitionType === 'start_work';
    const prompt = isStart
        ? "What is the first small step you will take?"
        : "What helped you finish this task?";

    const placeholders = isStart
        ? ["Outline the first paragraph.", "Sketch the prototype layout.", "Find two sources."]
        : ["Breaking it into smaller steps.", "Using the rubric.", "Working with my partner."];

    const randomPlaceholder = placeholders[Math.floor(Math.random() * placeholders.length)];

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && content.trim() && !isSubmitting) {
            handleSave();
        }
    };

    const handleSave = async () => {
        if (!content.trim() || isSubmitting) return;

        setIsSubmitting(true);
        try {
            await onSubmit(content.trim());
        } catch (error) {
            console.error("Failed to save reflection", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm overflow-y-auto h-full w-full z-[100] flex items-center justify-center p-4">
            <div className="relative w-full max-w-md shadow-2xl rounded-2xl bg-white border border-slate-100 animate-in fade-in zoom-in duration-200">
                <div className="p-6">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${isStart ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>
                                {isStart ? 'Starting Work' : 'Task Completed'}
                            </span>
                            <h3 className="text-xl font-bold text-slate-900 mt-2">{taskTitle}</h3>
                        </div>
                        <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="space-y-4">
                        <label className="block text-sm font-semibold text-slate-700">
                            {prompt}
                        </label>
                        <input
                            ref={inputRef}
                            type="text"
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none text-slate-900 placeholder:text-slate-400"
                            placeholder={randomPlaceholder}
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            onKeyDown={handleKeyDown}
                            maxLength={isStart ? 120 : 150}
                        />
                        <div className="flex justify-between items-center text-xs text-slate-400 px-1">
                            <span>Press Enter to save</span>
                            <span>{content.length} / {isStart ? 120 : 150}</span>
                        </div>
                    </div>

                    <div className="flex gap-3 mt-8">
                        <button
                            onClick={onSkip}
                            className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-600 font-semibold rounded-xl hover:bg-slate-200 transition-colors"
                            disabled={isSubmitting}
                        >
                            Skip This Time
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={isSubmitting || !content.trim()}
                            className={`flex-[2] px-4 py-2.5 text-white font-semibold rounded-xl shadow-lg shadow-indigo-200 transition-all ${content.trim() && !isSubmitting
                                    ? 'bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98]'
                                    : 'bg-indigo-300 cursor-not-allowed shadow-none'
                                }`}
                        >
                            {isSubmitting ? 'Saving...' : 'Save & Move Task'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
