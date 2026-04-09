import React, { useState } from 'react';
import { Task } from '../types';
import { api } from '../api/client';
import { ShieldAlert, ArrowRight, Clock, X, CheckCircle2, Send, ListChecks, ExternalLink, AlertTriangle } from 'lucide-react';

interface StuckTaskModalProps {
    task: Task;
    project?: { title: string }; // Made it optional to fix lint and allow fallback
    onClose: () => void;
    onResolved: () => void;
}

const ACTION_TREE = {
    "1": {
        title: "I don't know what to do next",
        options: [
            { id: "A", text: "Write the smallest possible next step (1 sentence)" },
            { id: "B", text: "Break this task into 3 smaller steps" },
            { id: "C", text: "Review project materials or the 'Resources' tab for hints" },
            { id: "D", text: "Ping Team: \"What's the next move on this?\"" },
            { id: "E", text: "Ping Teacher: \"I'm unsure what the first step should be.\"" }
        ]
    },
    "2": {
        title: "I don't understand something",
        options: [
            { id: "A", text: "The instructions - Rewrite in own words & find confusing part" },
            { id: "B", text: "The content - Open notes/resource and write 1 question" },
            { id: "C", text: "I'm not sure if it's correct - Check against task requirements or examples" },
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

const StuckTaskModal: React.FC<StuckTaskModalProps> = ({ task, project, onClose, onResolved }) => {
    const [step, setStep] = useState<1 | 2 | 3>(1);
    const [reason, setReason] = useState<string>("");
    const [actionId, setActionId] = useState<string>("");
    const [nextActionText, setNextActionText] = useState("");
    const [rephrasedText, setRephrasedText] = useState("");
    const [internalStep, setInternalStep] = useState<'rewrite' | 'action' | 'checkin' | 'pinging'>('rewrite');
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

    const handleCreateChecklistResolver = async () => {
        if (!rephrasedText.trim()) return;
        setSubmitting(true);
        try {
            await api.post(`/tasks/${task.id}/checklist`, {
                content: rephrasedText,
                is_stuck_resolver: true
            });
            setInternalStep('checkin');
        } catch (err) {
            console.error("Failed to create checklist item:", err);
            alert("Failed to save checklist item.");
        } finally {
            setSubmitting(false);
        }
    };

    const handleCreateSubtaskResolver = async () => {
        if (!rephrasedText.trim()) return;
        setSubmitting(true);
        try {
            await api.post(`/projects/${task.project_id}/tasks`, {
                title: rephrasedText,
                parent_task_id: task.id,
                status: 'todo',
                priority: 'P3',
                is_stuck_resolver: true
            });
            setInternalStep('checkin');
        } catch (err) {
            console.error("Failed to create subtask:", err);
            alert("Failed to save subtask.");
        } finally {
            setSubmitting(false);
        }
    };

    const handleSubmit = async () => {
        const textToLog = (reason === '2' && actionId === 'A') ? rephrasedText : nextActionText;
        
        if (!textToLog.trim()) {
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
                next_action_text: textToLog
            });

            // 2. If it's a ping action, also send a message to the task history
            if (isPing || internalStep === 'pinging') {
                const messageToSend = (reason === '2' && actionId === 'A') || internalStep === 'pinging' ? nextActionText : textToLog;
                await api.post(`/tasks/${task.id}/messages`, {
                    message: messageToSend,
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
                            <button onClick={() => {
                                if (reason === '2' && actionId === 'A' && internalStep !== 'rewrite') {
                                    if (internalStep === 'action') setInternalStep('rewrite');
                                    else if (internalStep === 'checkin') setInternalStep('action');
                                    else if (internalStep === 'pinging') setInternalStep('checkin');
                                } else {
                                    setStep(2);
                                }
                            }} className="text-sm text-gray-500 hover:text-amber-600 mb-4 inline-flex items-center">
                                &larr; Back
                            </button>

                            {/* SPECIALIZED FLOW: Rewrite Instructions (2-A) */}
                            {reason === '2' && actionId === 'A' ? (
                                <div className="space-y-6">
                                    {internalStep === 'rewrite' && (
                                        <div className="animate-in fade-in duration-500">
                                            <div className="bg-blue-50 p-5 rounded-xl border border-blue-100 mb-6 flex gap-4 items-start">
                                                <div className="bg-blue-500 p-2 rounded-lg text-white shrink-0">
                                                    <AlertTriangle className="w-5 h-5" />
                                                </div>
                                                <p className="text-blue-900 text-sm leading-relaxed">
                                                    Feeling stuck is a normal part of the process. Rephrasing the goal is a common and effective strategy to help you understand what needs to be done next.
                                                </p>
                                            </div>
                                            <h3 className="text-xl font-bold text-gray-900 mb-4">Rephrase the goal or instructions in your own words:</h3>
                                            <textarea
                                                value={rephrasedText}
                                                onChange={(e) => setRephrasedText(e.target.value)}
                                                placeholder="What are we trying to achieve here? Write it simply..."
                                                className="w-full p-4 rounded-xl border-2 border-gray-100 focus:border-amber-400 focus:ring-0 outline-none resize-none min-h-[120px] text-lg text-gray-800"
                                                autoFocus
                                            />
                                            <button
                                                onClick={() => setInternalStep('action')}
                                                disabled={!rephrasedText.trim()}
                                                className="w-full mt-6 py-4 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white rounded-xl font-bold text-lg flex items-center justify-center transition-all"
                                            >
                                                Continue <ArrowRight className="w-5 h-5 ml-2" />
                                            </button>
                                        </div>
                                    )}

                                    {internalStep === 'action' && (
                                        <div className="animate-in zoom-in-95 duration-300 text-center">
                                            <div className="bg-amber-50 p-4 rounded-xl border border-amber-200 mb-6 italic text-amber-800">
                                                "{rephrasedText}"
                                            </div>

                                            <div className="text-center mb-8">
                                                <h3 className="text-xl font-bold text-gray-900 mb-4">Did rephrasing help clarify the goal?</h3>
                                                
                                                {/* NO PATH */}
                                                <div className="bg-white p-4 rounded-2xl border border-gray-100 mb-6 text-center max-w-sm mx-auto">
                                                    <p className="text-sm text-gray-500 mb-3">If you're still not sure what to do:</p>
                                                    <button 
                                                        onClick={() => {
                                                            const taskTitle = task?.title || 'this task';
                                                            const projectTitle = project?.title || 'this project';
                                                            const draft = `Hi! I'm stuck on "${taskTitle}" for ${projectTitle}. I tried to rephrase the goal as: "${rephrasedText}", but I still need help with... `;
                                                            setNextActionText(draft);
                                                            setInternalStep('pinging');
                                                        }}
                                                        className="font-bold text-amber-600 hover:text-amber-700 underline text-lg py-2 px-6 bg-amber-50 rounded-xl w-full transition-all"
                                                    >
                                                        No, I'm still stuck. Ask my teacher.
                                                    </button>
                                                </div>

                                                {/* YES PATH */}
                                                <div className="pt-4 border-t border-gray-100">
                                                    <p className="text-sm text-gray-500 mb-4">If it did, let's make it actionable:</p>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                <button 
                                                    onClick={handleCreateChecklistResolver}
                                                    className="p-6 rounded-2xl border-2 border-gray-100 hover:border-indigo-500 hover:bg-indigo-50 transition-all text-center group"
                                                >
                                                    <ListChecks className="w-8 h-8 text-indigo-500 mx-auto mb-3 group-hover:scale-110 transition-transform" />
                                                    <span className="block font-bold text-gray-900">Add as Checklist Item</span>
                                                    <span className="text-xs text-gray-500 block mt-1">A small step in this task</span>
                                                </button>
                                                <button 
                                                    onClick={handleCreateSubtaskResolver}
                                                    className="p-6 rounded-2xl border-2 border-gray-100 hover:border-emerald-500 hover:bg-emerald-50 transition-all text-center group"
                                                >
                                                    <ExternalLink className="w-8 h-8 text-emerald-500 mx-auto mb-3 group-hover:scale-110 transition-transform" />
                                                    <span className="block font-bold text-gray-900">Add as Subtask</span>
                                                    <span className="text-xs text-gray-500 block mt-1">A new connected task</span>
                                                </button>
                                            </div>
                                            <button onClick={() => setInternalStep('checkin')} className="mt-8 text-sm text-gray-400 hover:text-gray-600 font-medium">Skip for now</button>
                                        </div>
                                    )}

                                    {internalStep === 'checkin' && (
                                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 text-center">
                                            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                                                <CheckCircle2 className="w-10 h-10 text-green-600" />
                                            </div>
                                            <h3 className="text-2xl font-bold text-gray-900 mb-2">Progress made!</h3>
                                            <p className="text-gray-600 mb-8 max-w-sm mx-auto">
                                                After rephrasing this goal, do you feel ready to start work, or are you still feeling stuck?
                                            </p>
                                            <div className="flex flex-col gap-3">
                                                <button 
                                                    onClick={onResolved}
                                                    className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transition-all"
                                                >
                                                    I'm ready to start!
                                                </button>
                                                <button 
                                                    onClick={() => {
                                                        const taskTitle = task?.title || 'this task';
                                                        const projectTitle = project?.title || 'this project';
                                                        const draft = `Hi! I'm stuck on "${taskTitle}" for ${projectTitle}. I tried to rephrase the goal as: "${rephrasedText}", but I still need help with... `;
                                                        setNextActionText(draft);
                                                        setInternalStep('pinging');
                                                    }}
                                                    className="w-full py-3 bg-white border border-gray-200 text-gray-600 hover:border-amber-400 hover:text-amber-700 rounded-xl font-bold transition-all"
                                                >
                                                    Still stuck... I need help
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {internalStep === 'pinging' && (
                                        <div className="animate-in fade-in duration-300">
                                            <h3 className="text-xl font-bold text-gray-900 mb-2 text-center">Reach out for help</h3>
                                            <p className="text-gray-600 text-sm text-center mb-6">
                                                Complete your message. Your rephrase will help others understand where to jump in.
                                            </p>
                                            <div className="bg-amber-50 p-5 rounded-xl border border-amber-200 mb-6">
                                                <textarea
                                                    value={nextActionText}
                                                    onChange={(e) => setNextActionText(e.target.value)}
                                                    className="w-full p-4 rounded-xl border-amber-300 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none resize-none min-h-[150px] text-gray-800"
                                                    autoFocus
                                                />
                                            </div>
                                            <div className="flex flex-col gap-3">
                                                <button
                                                    onClick={handleSubmit}
                                                    disabled={submitting}
                                                    className="w-full py-4 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold text-lg flex items-center justify-center transition-all shadow-md"
                                                >
                                                    Send Draft <Send className="w-5 h-5 ml-2" />
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                /* STANDARD FLOW */
                                <>
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
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default StuckTaskModal;
