import React, { useState, useEffect } from 'react';
import { Project, ProjectResource, User } from '../types';
import { api } from '../api/client';
import { useToast } from '../contexts/ToastContext';
import { X, ExternalLink, Plus, MessageCircle } from 'lucide-react';

interface ProjectQna {
    id: number;
    project_id: number;
    author_id: number;
    question: string;
    answer?: string;
    answered_by?: number;
    author_name?: string;
    answered_by_name?: string;
    created_at?: string;
    updated_at?: string;
}

interface ProjectHomeModalProps {
    isOpen: boolean;
    onClose: () => void;
    project: Project;
    currentUser: User | null;
}

export const ProjectHomeModal: React.FC<ProjectHomeModalProps> = ({ isOpen, onClose, project, currentUser }) => {
    const { addToast } = useToast();
    const [activeTab, setActiveTab] = useState<'overview' | 'resources' | 'qna'>('overview');

    // Resources state
    const [resources, setResources] = useState<ProjectResource[]>([]);
    const [loadingResources, setLoadingResources] = useState(false);
    const [newResourceTitle, setNewResourceTitle] = useState('');
    const [newResourceUrl, setNewResourceUrl] = useState('');
    const [newResourceType, setNewResourceType] = useState<'link' | 'file'>('link');

    // Q&A state
    const [questions, setQuestions] = useState<ProjectQna[]>([]);
    const [loadingQna, setLoadingQna] = useState(false);
    const [newQuestion, setNewQuestion] = useState('');
    const [answeringId, setAnsweringId] = useState<number | null>(null);
    const [answerText, setAnswerText] = useState('');

    useEffect(() => {
        if (isOpen) {
            fetchResources();
            fetchQna();
        }
    }, [isOpen, project.id]);

    const fetchResources = async () => {
        setLoadingResources(true);
        try {
            const data = await api.get<ProjectResource[]>(`/projects/${project.id}/resources`);
            // Only show shared resources (team_id is null/undefined)
            setResources((data || []).filter(r => !r.team_id));
        } catch (e) {
            console.error(e);
        } finally {
            setLoadingResources(false);
        }
    };

    const fetchQna = async () => {
        setLoadingQna(true);
        try {
            const data = await api.get<ProjectQna[]>(`/projects/${project.id}/qna`);
            setQuestions(data || []);
        } catch (e) {
            console.error(e);
        } finally {
            setLoadingQna(false);
        }
    };

    const handleAddResource = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.post(`/projects/${project.id}/resources`, {
                title: newResourceTitle,
                url: newResourceUrl,
                type: newResourceType
            });
            addToast('Resource added', 'success');
            setNewResourceTitle('');
            setNewResourceUrl('');
            fetchResources();
        } catch (e) {
            addToast('Failed to add resource', 'error');
        }
    };

    const handleAskQuestion = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newQuestion.trim()) return;
        try {
            await api.post(`/projects/${project.id}/qna`, {
                question: newQuestion
            });
            addToast('Question submitted', 'success');
            setNewQuestion('');
            fetchQna();
        } catch (e) {
            addToast('Failed to submit question', 'error');
        }
    };

    const submitAnswer = async (qnaId: number) => {
        if (!answerText.trim()) return;
        try {
            await api.put(`/projects/${project.id}/qna/${qnaId}`, {
                answer: answerText
            });
            addToast('Answer submitted', 'success');
            setAnsweringId(null);
            setAnswerText('');
            fetchQna();
        } catch (e) {
            addToast('Failed to submit answer', 'error');
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
                <div className="flex justify-between items-center p-6 border-b border-gray-200">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">{project.title}</h2>
                        <p className="text-gray-500 font-medium">Project Brief & Home</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                        <X className="w-6 h-6 text-gray-400" />
                    </button>
                </div>

                <div className="flex border-b border-gray-200 px-6">
                    <button
                        onClick={() => setActiveTab('overview')}
                        className={`py-3 px-4 font-medium text-sm border-b-2 transition-colors ${activeTab === 'overview' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                    >
                        Overview
                    </button>
                    <button
                        onClick={() => setActiveTab('resources')}
                        className={`py-3 px-4 font-medium text-sm border-b-2 transition-colors ${activeTab === 'resources' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                    >
                        Shared Resources
                    </button>
                    <button
                        onClick={() => setActiveTab('qna')}
                        className={`py-3 px-4 font-medium text-sm border-b-2 transition-colors ${activeTab === 'qna' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                    >
                        Q&A Forum
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
                    {activeTab === 'overview' && (
                        <div className="space-y-6">
                            <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Driving Question</h3>
                                <p className="text-lg font-medium text-gray-900">{project.driving_question}</p>
                            </div>
                            <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Project Description</h3>
                                {project.description ? (
                                    <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: project.description }} />
                                ) : (
                                    <p className="text-gray-400 italic">No description provided.</p>
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === 'resources' && (
                        <div className="space-y-6">
                            {currentUser?.role === 'teacher' && (
                                <form onSubmit={handleAddResource} className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm">
                                    <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2"><Plus className="w-4 h-4" /> Add Shared Resource</h3>
                                    <div className="flex gap-3">
                                        <input
                                            type="text"
                                            placeholder="Title"
                                            value={newResourceTitle}
                                            onChange={e => setNewResourceTitle(e.target.value)}
                                            className="flex-1 px-3 py-2 border rounded-md text-sm"
                                            required
                                        />
                                        <input
                                            type="url"
                                            placeholder="URL"
                                            value={newResourceUrl}
                                            onChange={e => setNewResourceUrl(e.target.value)}
                                            className="flex-[2] px-3 py-2 border rounded-md text-sm"
                                            required
                                        />
                                        <select value={newResourceType} onChange={e => setNewResourceType(e.target.value as any)} className="px-3 py-2 border rounded-md text-sm">
                                            <option value="link">Link</option>
                                            <option value="file">File/Doc</option>
                                        </select>
                                        <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-700">Add</button>
                                    </div>
                                </form>
                            )}

                            {loadingResources ? <p className="text-gray-500 text-center py-4">Loading resources...</p> :
                                resources.length === 0 ? (
                                    <div className="text-center py-8 bg-white rounded-lg border border-dashed border-gray-300 text-gray-500">
                                        No shared resources available yet.
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        {resources.map(res => (
                                            <a key={res.id} href={res.url} target="_blank" rel="noopener noreferrer" className="block bg-white p-4 rounded-lg border border-gray-200 shadow-sm hover:border-indigo-300 hover:shadow-md transition-all group">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <h4 className="font-semibold text-gray-900 group-hover:text-indigo-600 flex items-center gap-2">
                                                            {res.title}
                                                        </h4>
                                                        <p className="text-xs text-gray-500 mt-1 uppercase tracking-wide">{res.type}</p>
                                                    </div>
                                                    <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-indigo-500" />
                                                </div>
                                            </a>
                                        ))}
                                    </div>
                                )
                            }
                        </div>
                    )}

                    {activeTab === 'qna' && (
                        <div className="space-y-6">
                            {currentUser?.role === 'student' && (
                                <form onSubmit={handleAskQuestion} className="bg-white p-5 rounded-lg border border-indigo-200 shadow-sm bg-indigo-50/10">
                                    <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">Ask a Question</h3>
                                    <p className="text-xs text-gray-500 mb-3">Questions and answers will be visible to everyone in the project.</p>
                                    <div className="flex gap-3">
                                        <input
                                            type="text"
                                            placeholder="What do you need help with?"
                                            value={newQuestion}
                                            onChange={e => setNewQuestion(e.target.value)}
                                            className="flex-1 px-4 py-2 border rounded-md text-sm"
                                            required
                                        />
                                        <button type="submit" disabled={!newQuestion.trim()} className="bg-indigo-600 text-white px-6 py-2 rounded-md text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">Ask</button>
                                    </div>
                                </form>
                            )}

                            {loadingQna ? <p className="text-gray-500 text-center py-4">Loading Q&A...</p> :
                                questions.length === 0 ? (
                                    <div className="text-center py-12 bg-white rounded-lg border border-dashed border-gray-300">
                                        <MessageCircle className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                                        <p className="text-gray-500">No questions have been asked yet.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {questions.map(q => (
                                            <div key={q.id} className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                                                <div className="p-4 bg-gray-50 border-b border-gray-200">
                                                    <div className="flex justify-between items-start mb-2">
                                                        <span className="font-semibold text-gray-900">{q.question}</span>
                                                        <span className="text-xs text-gray-400 bg-white px-2 py-1 rounded shadow-sm">
                                                            Asked by {q.author_name || 'Student'}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="p-4">
                                                    {q.answer ? (
                                                        <div className="flex gap-3">
                                                            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold shrink-0">
                                                                T
                                                            </div>
                                                            <div>
                                                                <p className="text-gray-800 text-sm whitespace-pre-wrap">{q.answer}</p>
                                                                <p className="text-xs text-gray-500 mt-2">Answered by {q.answered_by_name || 'Teacher'}</p>
                                                            </div>
                                                        </div>
                                                    ) : currentUser?.role === 'teacher' ? (
                                                        <div>
                                                            {answeringId === q.id ? (
                                                                <div>
                                                                    <textarea
                                                                        value={answerText}
                                                                        onChange={e => setAnswerText(e.target.value)}
                                                                        className="w-full border rounded-md p-3 text-sm min-h-[100px] mb-2 focus:ring-2 focus:ring-indigo-500"
                                                                        placeholder="Write your answer here..."
                                                                    />
                                                                    <div className="flex gap-2 justify-end">
                                                                        <button onClick={() => setAnsweringId(null)} className="px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-md">Cancel</button>
                                                                        <button onClick={() => submitAnswer(q.id)} className="px-3 py-1.5 text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 rounded-md">Submit Answer</button>
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <button onClick={() => setAnsweringId(q.id)} className="text-sm font-medium text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
                                                                    <MessageCircle className="w-4 h-4" /> Answer Question
                                                                </button>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <p className="text-sm text-gray-400 italic">Waiting for an answer...</p>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )
                            }
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
