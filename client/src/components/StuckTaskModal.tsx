import React, { useState } from 'react';
import { Task } from '../types';
import { api } from '../api/client';
import { ShieldAlert, ArrowRight, Clock, X, CheckCircle2, Send } from 'lucide-react';

interface StuckTaskModalProps {
    task: Task;
    onClose: () => void;
    onResolved: () => void;
}

const ACTION_TREE = {
    "1": {
        title: "I don't know what to do next",
        options: [
            { id: "A", text: "Write the smallest possible next step (1 sentence)" },
            { id: "B", text: "Break this task into 3 smaller steps" },
            { id: "C", text: "Look at the rubric and match one requirement" },
            { id: "D", text: "Ping Team: \"What's the next move on this?\"" },
            { id: "E", text: "Ping Teacher: \"I'm unsure what the first step should be.\"" }
        ]
    },
    "2": {
        title: "I don't understand something",
        options: [
            { id: "A", text: "The instructions - Rewrite in own words & find confusing part" },
            { id: "B", text: "The content - Open notes/resource and write 1 question" },
            { id: "C", text: "I'm not sure if it's correct - Compare to rubric" },
            { id: "D", text: "Ping Team: \"Can someone explain ___?\"" },
            { id: "E", text: "Ping Teacher: \"I'm confused about ___.\"" }
        ]
    },
    "3": {
        title: "I'm waiting on someone or something",
        options: [
            { id: "A", text: "Switch to a different task you can control" },
            { id: "B", text: "Prepare the next step now" },
            { id: "C", text: "Draft a placeholder version" },
            { id: "D", text: "Ping Team: \"Are you finished with ___?\"" },
            { id: "E", text: "Ping Teacher: \"We're blocked waiting on ___.\"" }
        ]
    },
    "4": {
        title: "I got distracted / avoided it",
        options: [
            { id: "A", text: "5-Minute Restart - Write 1 sentence, start timer" },
            { id: "B", text: "10-Minute Focus Sprint - Choose 1 micro-step" },
            { id: "C", text: "Make an If-Then Plan" },
            { id: "D", text: "Move one task to Done (if partially complete)" },
            { id: "E", text: "Ping Teacher: \"I'm feeling stuck getting started.\"" }
        ]
    },
    "5": {
        title: "This task is bigger than we thought",
        options: [
            { id: "A", text: "Cut it into 3 clear subtasks" },
            { id: "B", text: "Reduce scope - Define a MVV (Minimum Viable Version)" },
            { id: "C", text: "Reassign roles in team" },
            { id: "D", text: "Ping Team: \"We need to split this differently.\"" },
            { id: "E", text: "Ping Teacher: \"We think this needs to be resized.\"" }
        ]
    }
};

const StuckTaskModal: React.FC<StuckTaskModalProps> = ({ task, onClose, onResolved }) => {
    const [step, setStep] = useState<1 | 2 | 3>(1);
    const [reason, setReason] = useState<string>("");
    const [actionId, setActionId] = useState<string>("");
    const [nextActionText, setNextActionText] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const handleReasonSelect = (rId: string) => {
        setReason(rId);
        setStep(2);
    };

    const handleActionSelect = (aId: string) => {
        setActionId(aId);
        setStep(3);
    };

    const selectedActionText = reason && actionId ? ACTION_TREE[reason as keyof typeof ACTION_TREE].options.find(o => o.id === actionId)?.text : '';
    const isPing = selectedActionText ? selectedActionText.includes('Ping') : false;
    const pingVisibility = selectedActionText?.includes('Teacher') ? 'teacher' : 'team';

    const handleSubmit = async () => {
        if (!nextActionText.trim()) {
            alert(isPing ? "Please enter your message." : "Please enter your next action to proceed.");
            return;
        }

        setSubmitting(true);
        try {
            const reasonText = ACTION_TREE[reason as keyof typeof ACTION_TREE].title;
            const actionText = selectedActionText || '';

            // 1. Log the stuck action tree result
            await api.post(`/tasks/${task.id}/stuck-log`, {
                reason: reasonText,
                action_taken: actionText,
                next_action_text: nextActionText
            });

            // 2. If it's a ping action, also send a message to the task history
            if (isPing) {
                await api.post(`/tasks/${task.id}/messages`, {
                    message: nextActionText,
                    visibility: pingVisibility
                });
            }

            onResolved();
        } catch (err) {
            console.error("Failed to submit:", err);
            alert("Failed to save. Please try again.");
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="bg-amber-500 text-white px-6 py-4 flex justify-between items-center shrink-0">
                    <div className="flex items-center">
                        <ShieldAlert className="w-6 h-6 mr-3" />
                        <div>
                            <h2 className="text-xl font-bold">Stuck Protocol</h2>
                            <p className="text-amber-100 text-sm">Task: {task.title}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-amber-600 rounded-lg transition-colors">
                        <X className="w-5 h-5 text-white" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 md:p-8 overflow-y-auto flex-1">

                    {/* Stepper */}
                    <div className="flex items-center mb-8">
                        <div className={`flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm ${step >= 1 ? 'bg-amber-500 text-white' : 'bg-gray-200 text-gray-400'}`}>1</div>
                        <div className={`flex-1 h-1 mx-2 rounded ${step >= 2 ? 'bg-amber-500' : 'bg-gray-200'}`}></div>
                        <div className={`flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm ${step >= 2 ? 'bg-amber-500 text-white' : 'bg-gray-200 text-gray-400'}`}>2</div>
                        <div className={`flex-1 h-1 mx-2 rounded ${step >= 3 ? 'bg-amber-500' : 'bg-gray-200'}`}></div>
                        <div className={`flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm ${step >= 3 ? 'bg-amber-500 text-white' : 'bg-gray-200 text-gray-400'}`}>3</div>
                    </div>

                    {step === 1 && (
                        <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                            <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">Why are you stuck?</h3>
                            <div className="grid grid-cols-1 space-y-3">
                                {Object.entries(ACTION_TREE).map(([id, node]) => (
                                    <button
                                        key={id}
                                        onClick={() => handleReasonSelect(id)}
                                        className="text-left w-full p-4 rounded-xl border-2 border-gray-100 hover:border-amber-400 hover:bg-amber-50 transition-all group flex items-center justify-between"
                                    >
                                        <span className="font-medium text-gray-800 group-hover:text-amber-900">{node.title}</span>
                                        <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-amber-500 transition-transform group-hover:translate-x-1" />
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {step === 2 && reason && (
                        <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                            <button onClick={() => setStep(1)} className="text-sm text-gray-500 hover:text-amber-600 mb-4 inline-flex items-center">
                                &larr; Back
                            </button>
                            <h3 className="text-2xl font-bold text-gray-900 mb-2">Choose an Action</h3>
                            <p className="text-gray-500 mb-6 font-medium bg-gray-50 p-3 rounded-lg border border-gray-100 italic">
                                "{ACTION_TREE[reason as keyof typeof ACTION_TREE].title}"
                            </p>

                            <div className="space-y-3">
                                {ACTION_TREE[reason as keyof typeof ACTION_TREE].options.map(opt => (
                                    <button
                                        key={opt.id}
                                        onClick={() => handleActionSelect(opt.id)}
                                        className="text-left w-full p-4 rounded-xl border-2 border-gray-100 hover:border-amber-400 hover:bg-amber-50 transition-all flex items-start group"
                                    >
                                        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-amber-100 text-amber-800 font-bold text-xs mr-4 shrink-0 mt-0.5">
                                            {opt.id}
                                        </div>
                                        <span className="font-medium text-gray-800 group-hover:text-amber-900">{opt.text}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                            <button onClick={() => setStep(2)} className="text-sm text-gray-500 hover:text-amber-600 mb-4 inline-flex items-center">
                                &larr; Back
                            </button>
                            <div className="text-center mb-6">
                                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">
                                    {isPing ? <Send className="w-8 h-8 text-green-600" /> : <CheckCircle2 className="w-8 h-8 text-green-600" />}
                                </div>
                                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                                    {isPing ? 'Draft a Message' : 'Final Step: Commit'}
                                </h3>
                                <p className="text-gray-600 max-w-sm mx-auto">
                                    {isPing ? 'Explain what you need help with. This will be sent as a message.' : 'Confirm your next action to get back on track. This task will move back to "Doing".'}
                                </p>
                            </div>

                            <div className="bg-amber-50 p-5 rounded-xl border border-amber-200 mb-6">
                                <label className="block text-sm font-bold text-amber-900 mb-2">
                                    {isPing ? 'Write your message to the team or teacher:' : 'Write your specific next action (1 clear sentence):'}
                                </label>
                                <textarea
                                    value={nextActionText}
                                    onChange={(e) => setNextActionText(e.target.value)}
                                    placeholder={isPing ? "e.g., I'm stuck on part 2, can someone explain..." : "e.g., I will look up how the map function works in JS..."}
                                    className="w-full p-3 rounded-lg border border-amber-300 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none resize-none"
                                    rows={3}
                                    autoFocus
                                />
                            </div>

                            <button
                                onClick={handleSubmit}
                                disabled={submitting || !nextActionText.trim()}
                                className="w-full py-4 bg-amber-500 hover:bg-amber-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-xl font-bold text-lg flex items-center justify-center transition-all shadow-md hover:shadow-lg"
                            >
                                {submitting ? 'Saving...' : (
                                    isPing ? (
                                        <>Send Message <Send className="w-5 h-5 ml-2" /></>
                                    ) : (
                                        <>Start Timer & Get Unstuck <Clock className="w-5 h-5 ml-2" /></>
                                    )
                                )}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default StuckTaskModal;
