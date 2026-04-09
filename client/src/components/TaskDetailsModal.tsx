import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { Task, Project, TaskReflection, ProjectResource, TaskMessage, TaskChecklistItem } from '../types';
import { X, CheckCircle2, Clock as ClockIcon, AlertCircle, Plus, ExternalLink, Link as LinkIcon, FileText, Pencil, AlertTriangle, Send, CheckSquare, Square, Trash2, ListChecks, Download, Archive, ArrowRight, ArrowLeft } from 'lucide-react';
import { api, API_BASE } from '../api/client';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import { SubtaskList } from './SubtaskList';

import { useNotifications } from '../contexts/NotificationContext';

interface TaskDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    task: Task | null;
    project: Project;
    onEditTask?: (task: Task) => void;
    onTaskClaim?: (taskId: number) => void;
    onTaskUpdate?: (updatedTask: Task) => void;
}

type TabType = 'overview' | 'reflections' | 'stuck-history' | 'resources' | 'messages';

export const TaskDetailsModal: React.FC<TaskDetailsModalProps> = ({ isOpen, onClose, task, project, onEditTask, onTaskClaim, onTaskUpdate }) => {
    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);
    const initialTabFromUrl = queryParams.get('tab') as TabType;
    
    const [activeTab, setActiveTab] = useState<TabType>(initialTabFromUrl || 'overview');
    const [reflections, setReflections] = useState<TaskReflection[]>([]);
    const [stuckLogs, setStuckLogs] = useState<any[]>([]);
    const [resources, setResources] = useState<ProjectResource[]>([]);
    const [messages, setMessages] = useState<TaskMessage[]>([]);
    const [newReflection, setNewReflection] = useState('');
    const [newMessage, setNewMessage] = useState('');
    const [messageVisibility, setMessageVisibility] = useState<'team' | 'teacher'>('team');
    const [newResourceTitle, setNewResourceTitle] = useState('');
    const [newResourceUrl, setNewResourceUrl] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [newResourceType, setNewResourceType] = useState<'link' | 'file'>('file');
    const [loading, setLoading] = useState(false);
    const [localTask, setLocalTask] = useState<Task | null>(task);
    const { addToast } = useToast();
    const { user } = useAuth();
    const [isStuck, setIsStuck] = useState(task?.is_stuck || false);
    const [checklist, setChecklist] = useState<any[]>([]);
    const [newChecklistItem, setNewChecklistItem] = useState('');
    const [history, setHistory] = useState<Task[]>([]);
    const [navDirection, setNavDirection] = useState<'forward' | 'backward' | null>(null);
    
    // Stuck Protocol Integration State
    const [stuckStep, setStuckStep] = useState<1 | 2 | 3>(1);
    const [stuckReason, setStuckReason] = useState<string>("");
    const [stuckActionId, setStuckActionId] = useState<string>("");
    const [stuckNextActionText, setStuckNextActionText] = useState("");
    const [showStuckResolverBanner, setShowStuckResolverBanner] = useState(false);
    const [stuckPanelCollapsed, setStuckPanelCollapsed] = useState(false);
    const [stuckSteps, setStuckSteps] = useState<string[]>(['', '', '']);
    const [stuckResolutionType, setStuckResolutionType] = useState<'checklist' | 'subtask' | null>('checklist');
    const [stuckSubStep, setStuckSubStep] = useState<'rewrite' | 'action' | 'checkin' | 'pinging' | 'write_question' | 'choose_timer' | 'countdown' | 'self_answer' | 'next_step'>('rewrite');
    const [rephrasedText, setRephrasedText] = useState("");
    const [stuckQuestion, setStuckQuestion] = useState("");
    const [stuckAnswer, setStuckAnswer] = useState("");
    const [stuckResearchIntent, setStuckResearchIntent] = useState("");
    const [timeLeft, setTimeLeft] = useState<number>(0);
    const [isTimerRunning, setIsTimerRunning] = useState(false);
    const [showAllMessages, setShowAllMessages] = useState(false);
    const { dismissTaskNotifications } = useNotifications();
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (isTimerRunning && timeLeft > 0) {
            timerRef.current = setInterval(() => {
                setTimeLeft(prev => prev - 1);
            }, 1000);
        } else if (timeLeft === 0 && isTimerRunning) {
            setIsTimerRunning(false);
            setStuckSubStep('self_answer');
            if (timerRef.current) clearInterval(timerRef.current);
        }

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [isTimerRunning, timeLeft]);

    useEffect(() => {
        if (isOpen && localTask?.id) {
            dismissTaskNotifications(localTask.id);
        }
    }, [isOpen, localTask?.id, dismissTaskNotifications]);

    const hasDismissedRef = useRef<number | null>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        if (activeTab === 'messages') {
            scrollToBottom();
        }
    }, [messages, activeTab]);
    
    const cleanUrl = (input: string) => {
        return input.replace(/^(https?:\/\/)+/g, '').trim();
    };
    const [localPriority, setLocalPriority] = useState<'P1' | 'P2' | 'P3'>(task?.priority || 'P3');

    useEffect(() => {
        if (localTask?.id === task?.id) {
            setIsStuck(task?.is_stuck || false);
            setLocalPriority(task?.priority || 'P3');
        }
    }, [task, localTask?.id]);

    const isTeacher = user?.role === 'teacher' || user?.role === 'admin';
    const isOwner = task?.assignee_id === user?.id;
    const canEdit = isTeacher || isOwner;

    const fetchData = async () => {
        if (!localTask) return;
        setLoading(true);
        try {
            const [taskRes, refRes, stuckRes, resRes, msgRes, checkRes] = await Promise.all([
                api.get<Task>(`/tasks/${localTask.id}`),
                api.get<TaskReflection[]>(`/tasks/${localTask.id}/reflections`).catch(() => []),
                api.getStuckLogs(localTask.id).catch(() => []),
                api.get<ProjectResource[]>(`/tasks/${localTask.id}/resources`).catch(() => []),
                api.get<TaskMessage[]>(`/tasks/${localTask.id}/messages${showAllMessages ? '' : '?limit=15'}`).catch(() => []),
                api.get<any[]>(`/tasks/${localTask.id}/checklist`).catch(() => [])
            ]);
            if (taskRes) setLocalTask(taskRes);
            setReflections(refRes || []);
            setStuckLogs(stuckRes || []);
            setResources(resRes || []);
            setMessages(msgRes || []);
            setChecklist(checkRes || []);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen && task && (!localTask || task.id !== localTask.id) && history.length === 0) {
            setLocalTask(task);
            setHistory([]);
            setNavDirection(null);
            // Deep link support: auto-focus the messages tab if requested in URL
            setActiveTab(initialTabFromUrl || 'overview');
        }
    }, [isOpen, task?.id, initialTabFromUrl]);

    // Ensure the tab switches even if the modal was already open for this task
    useEffect(() => {
        if (isOpen && initialTabFromUrl) {
            setActiveTab(initialTabFromUrl);
        }
    }, [isOpen, initialTabFromUrl]);

    // Re-fetch data whenever the Discussion tab is focused to ensure live updates
    useEffect(() => {
        if (isOpen && activeTab === 'messages' && localTask?.id) {
            fetchData();
        }
    }, [isOpen, activeTab, localTask?.id]);

    // Background polling for live updates while the modal is open (Discussion, Stuck Protocol, etc.)
    useEffect(() => {
        if (isOpen && localTask?.id) {
            fetchData();
            const interval = setInterval(fetchData, 10000); // Poll every 10s
            return () => clearInterval(interval);
        }
    }, [isOpen, localTask?.id]);

    // Handle initial notification dismissal
    useEffect(() => {
        if (isOpen && localTask?.id && hasDismissedRef.current !== localTask.id) {
            dismissTaskNotifications(localTask.id);
            hasDismissedRef.current = localTask.id;
        } else if (!isOpen) {
            hasDismissedRef.current = null;
        }
    }, [isOpen, localTask?.id, dismissTaskNotifications]);

    const handleFetchAllMessages = () => {
        setShowAllMessages(true);
    };

    useEffect(() => {
        if (showAllMessages && isOpen && localTask?.id) {
            fetchData();
        }
    }, [showAllMessages]);

    const handleSubtaskClick = (subtask: Task) => {
        if (localTask) {
            setNavDirection('forward');
            setHistory([...history, localTask]);
            setLocalTask(subtask);
            setActiveTab('overview');
        }
    };

    const handleBack = () => {
        if (history.length > 0) {
            setNavDirection('backward');
            const newHistory = [...history];
            const parent = newHistory.pop();
            setHistory(newHistory);
            if (parent) {
                setLocalTask(parent);
                setActiveTab('overview');
            }
        }
    };

    const handleClose = () => {
        setHistory([]);
        setNavDirection(null);
        onClose();
    };

    const handleToggleStuck = async () => {
        if (!task) return;
        const newStuckState = !isStuck;
        setIsStuck(newStuckState);
        try {
            const res = await api.post<{ ok: boolean, task: Task }>(`/tasks/${task.id}/toggle-stuck`, { is_stuck: newStuckState });
            addToast(newStuckState ? "Task marked as stuck." : "Task marked as unstuck.", "success");
            
            if (onTaskUpdate && res.task) onTaskUpdate(res.task);

            if (newStuckState) {
                setStuckStep(1);
                setStuckReason("");
                setStuckActionId("");
                setStuckNextActionText("");
                setStuckPanelCollapsed(false);
                setStuckSteps(['', '', '']);
                setStuckResolutionType('checklist');
                setStuckSubStep('rewrite');
                setRephrasedText("");
                setStuckQuestion("");
                setStuckAnswer("");
                setStuckResearchIntent("");
            }
        } catch (err) {
            console.error("Failed to toggle stuck state", err);
            setIsStuck(!newStuckState);
            addToast("Failed to update task state.", "error");
        }
    };

    const handleCreateStuckChecklist = async () => {
        if (!rephrasedText.trim() || !task) return;
        setLoading(true);
        try {
            await api.post(`/tasks/${task.id}/checklist`, {
                content: rephrasedText,
                is_stuck_resolver: true
            });
            setStuckSubStep('checkin');
            fetchData();
        } catch (err) {
            console.error("Failed to create checklist item:", err);
            addToast("Failed to save checklist item.", "error");
        } finally {
            setLoading(false);
        }
    };

    const handleCreateStuckSubtask = async () => {
        if (!rephrasedText.trim() || !task) return;
        setLoading(true);
        try {
            await api.post(`/projects/${project.id}/tasks`, {
                title: rephrasedText,
                parent_task_id: task.id,
                status: 'todo',
                priority: 'P3',
                is_stuck_resolver: true,
                assignee_id: user?.id
            });
            setStuckSubStep('checkin');
            fetchData();
        } catch (err) {
            console.error("Failed to create subtask:", err);
            addToast("Failed to save subtask.", "error");
        } finally {
            setLoading(false);
        }
    };

    const ACTION_TREE = {
        "1": {
            title: "I don't know what to do next",
            description: "It’s normal to feel stuck when a task feels too big or unclear. Breaking it down into the smallest possible 'micro-step' bypasses the part of our brain that feels overwhelmed, making it easier to just start.",
            options: [
                { id: "A", text: "Write the smallest possible next step (1 sentence)" },
                { id: "B", text: "Break this task into 3 smaller steps" },
                { id: "C", text: "Ping Team: \"What's the next move on this?\"" },
                { id: "D", text: "Ping Teacher: \"I'm unsure what the first step should be.\"" }
            ]
        },
        "2": {
            title: "I don't understand something",
            description: "Sometimes our brains need a different 'entry point.' Asking for a specific clarification or looking for a visual example can help translate instructions into action.",
            options: [
                { id: "A", text: "The instructions - Rewrite in own words & find confusing part" },
                { id: "B", text: "The content - Focused Question & Research Timer" },
                { id: "C", text: "I'm not sure if it's correct - Check against task requirements or examples" },
                { id: "D", text: "Ping Team: \"Can someone explain ___?\"" },
                { id: "E", text: "Ping Teacher: \"I'm confused about ___.\"" }
            ]
        },
        "3": {
            title: "I'm waiting on someone or something",
            description: "External blocks can be frustrating. Identifying what you *can* control in the meantime keeps your momentum going while you wait for others.",
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
            description: "Distraction is often a sign of 'friction' or hidden stress. A quick 5-minute 'Focus Sprint' can help reset your brain and lower the barrier to getting back on track.",
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
            description: "Complexity is the enemy of action. When a task expands, our brain might want to avoid it. Resizing the task back to a manageable 'bite-size' restores our sense of control.",
            options: [
                { id: "A", text: "Cut it into 3 clear subtasks" },
                { id: "B", text: "Reduce scope - Define a MVV (Minimum Viable Version)" },
                { id: "C", text: "Reassign roles in team" },
                { id: "D", text: "Ping Team: \"We need to split this differently.\"" },
                { id: "E", text: "Ping Teacher: \"We think this needs to be resized.\"" }
            ]
        }
    };

    const handleStuckSubmit = async () => {
        const isRewriteFlow = stuckReason === '2' && stuckActionId === 'A';
        const isProductiveStruggle = stuckReason === '2' && stuckActionId === 'B';
        const isThreeSteps = (stuckReason === "1" && stuckActionId === "B") || (stuckReason === "5" && stuckActionId === "A");
        
        let hasText = false;
        if (isRewriteFlow) {
            hasText = rephrasedText.trim().length > 0;
        } else if (isThreeSteps) {
            hasText = stuckSteps.every(s => s.trim().length > 0);
        } else if (isProductiveStruggle) {
            if (stuckSubStep === 'next_step' || stuckSubStep === 'pinging') {
                hasText = stuckNextActionText.trim().length > 0;
            } else {
                hasText = true; 
            }
        } else {
            hasText = stuckNextActionText.trim().length > 0;
        }
        
        if (!hasText) {
            addToast("Please complete the required text to proceed.", "error");
            return;
        }

        setLoading(true);
        try {
            const reasonText = ACTION_TREE[stuckReason as keyof typeof ACTION_TREE].title;
            const selectedActionText = ACTION_TREE[stuckReason as keyof typeof ACTION_TREE].options.find(o => o.id === stuckActionId)?.text || '';
            const isSmallestStep = stuckReason === "1" && stuckActionId === "A";
            const isPing = selectedActionText.includes('Ping') || stuckSubStep === 'pinging';
            
            let textToLog = stuckNextActionText;
            if (isRewriteFlow) textToLog = rephrasedText;
            if (isProductiveStruggle) {
                textToLog = `Q: ${stuckQuestion} | Focus: ${stuckResearchIntent} | A: ${stuckAnswer}`;
                if (stuckSubStep === 'next_step') {
                    textToLog += ` | Next Step: ${stuckNextActionText}`;
                }
            }
            if (isThreeSteps) textToLog = stuckSteps.join(' | ');

            let resolution = "Strategy Committed";
            const isResolverAction = isSmallestStep || isThreeSteps || (isProductiveStruggle && stuckSubStep === 'next_step' && stuckResolutionType === 'checklist');
            
            if (isPing) {
                resolution = selectedActionText.includes('Teacher') ? "Messaged Teacher" : "Messaged Team";
            } else if (isResolverAction) {
                resolution = "Micro-Steps Created";
            } else if (stuckSubStep === 'next_step' && !stuckResolutionType) {
                resolution = "Self-Resolved (Unstuck)";
            } else if (!isPing) {
                resolution = "Self-Resolved (Unstuck)";
            }

            await api.post(`/tasks/${task?.id}/stuck-log`, {
                reason: reasonText,
                action_taken: selectedActionText,
                next_action_text: textToLog,
                should_unstick: !isPing,
                resolution: resolution
            });

            if (isPing) {
                const visibility = selectedActionText.includes('Teacher') ? 'teacher' : 'team';
                const message = (isRewriteFlow || stuckSubStep === 'pinging') ? stuckNextActionText : textToLog;
                await api.post(`/tasks/${task?.id}/messages`, {
                    message: message,
                    visibility: visibility
                });
            }

            if (isSmallestStep || (isProductiveStruggle && stuckSubStep === 'next_step' && stuckResolutionType === 'checklist')) {
                await api.post(`/tasks/${task?.id}/checklist`, { 
                    content: stuckNextActionText,
                    is_stuck_resolver: true 
                });
            } else if (isThreeSteps) {
                for (const stepText of stuckSteps) {
                    if (stuckResolutionType === 'checklist') {
                        await api.post(`/tasks/${task?.id}/checklist`, { 
                            content: stepText,
                            is_stuck_resolver: true 
                        });
                    } else {
                        await api.post(`/projects/${project.id}/tasks`, {
                            title: stepText,
                            parent_task_id: task?.id,
                            is_stuck_resolver: true,
                            status: 'todo',
                            assignee_id: user?.id
                        });
                    }
                }
            }


            if (!isResolverAction && !isPing) {
                await api.post(`/tasks/${task?.id}/toggle-stuck`, { is_stuck: false });
                setIsStuck(false);
                addToast("Action plan committed! Task is now active.", "success");
            } else if (isPing) {
                addToast("Message sent! Your team/teacher will be notified.", "success");
                setStuckPanelCollapsed(true);
            } else {
                const msg = isSmallestStep ? "Micro-step added!" : `${stuckResolutionType === 'checklist' ? 'Checklist items' : 'Subtasks'} added!`;
                addToast(`${msg} Complete just one to get unstuck.`, "warning");
                setShowStuckResolverBanner(true);
                setStuckPanelCollapsed(true);
            }
            
            setStuckReason("");
            setStuckActionId("");
            setStuckNextActionText("");
            setStuckStep(1);
            
            fetchData();
        } catch (err) {
            console.error(err);
            addToast("Failed to save action plan.", "error");
        } finally {
            setLoading(false);
        }
    };

    const handleStuckActionSelect = (option: { id: string, text: string }) => {
        setStuckActionId(option.id);
        setStuckStep(3);
        
        if (stuckReason === '2' && option.id === 'B') {
            setStuckSubStep('write_question');
        } else if (stuckReason === '2' && option.id === 'A') {
            setStuckSubStep('rewrite');
        }

        // Auto-fill template for pings
        if (option.text.includes('Ping')) {
            const projectTitle = project?.title || 'this project';
            const taskTitle = task?.title || 'this task';
            if (option.text.includes('Teacher')) {
                setStuckNextActionText(`Hi! I'm stuck on "${taskTitle}" for ${projectTitle}. I'm not sure what the next step is. Do you have any suggestions?`);
            } else {
                setStuckNextActionText(`Hey team! I'm stuck on "${taskTitle}" for ${projectTitle}. I'm not sure what the next move should be. Can anyone help clarify?`);
            }
        } else {
            setStuckNextActionText("");
        }
    };

    const triggerCelebration = () => {
        const particleCount = 100;
        const colors = [
            'bg-amber-400', 'bg-indigo-500', 'bg-green-400', 'bg-pink-400', 'bg-blue-400',
            'bg-yellow-300', 'bg-purple-500', 'bg-rose-400'
        ];
        
        for (let i = 0; i < particleCount; i++) {
            const particle = document.createElement('div');
            const shapeType = Math.random();
            const borderRadius = shapeType > 0.6 ? 'rounded-full' : (shapeType > 0.3 ? 'rounded-sm' : 'rounded-none');
            const isStrip = shapeType < 0.2;
            
            particle.className = `fixed pointer-events-none z-[30000] animate-in fade-out duration-[1500ms] fill-mode-forwards ${borderRadius}`;
            
            const color = colors[Math.floor(Math.random() * colors.length)];
            const size = isStrip ? (Math.random() * 15 + 8) : (Math.floor(Math.random() * 8) + 5);
            const width = isStrip ? 3 : size;
            const height = isStrip ? size : size;
            
            const startX = 40 + (Math.random() * 20); 
            const startY = 60 + (Math.random() * 20);
            
            particle.style.width = `${width}px`;
            particle.style.height = `${height}px`;
            particle.style.left = `${startX}%`;
            particle.style.top = `${startY}%`;
            particle.classList.add(color);
            
            const angle = Math.random() * Math.PI * 2;
            const velocity = Math.random() * 250 + 150;
            const destX = Math.cos(angle) * velocity;
            const destY = Math.sin(angle) * velocity - 150;
            const rotation = Math.random() * 720 - 360;
            
            particle.style.transition = 'all 1.5s cubic-bezier(0.1, 0.8, 0.3, 1)';
            document.body.appendChild(particle);
            
            requestAnimationFrame(() => {
                particle.style.transform = `translate(${destX}px, ${destY}px) rotate(${rotation}deg)`;
                particle.style.opacity = '0';
            });
            
            setTimeout(() => {
                if (document.body.contains(particle)) {
                    document.body.removeChild(particle);
                }
            }, 1600);
        }
    };

    const handleAddReflection = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newReflection.trim() || !task) return;
        try {
            await api.post(`/tasks/${task.id}/reflections`, { content: newReflection });
            setNewReflection('');
            fetchData();
        } catch (err) {
            console.error(err);
        }
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !task) return;
        setLoading(true);
        try {
            await api.post(`/tasks/${task.id}/messages`, { message: newMessage, visibility: messageVisibility });
            setNewMessage('');
            fetchData();
        } catch (err) {
            console.error(err);
            addToast("Failed to send message.", "error");
        } finally {
            setLoading(false);
        }
    };

    const handleAddResource = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!task) return;
        if (newResourceType === 'link' && (!newResourceTitle.trim() || !newResourceUrl.trim())) return;
        if (newResourceType === 'file' && !file) return;

        try {
            if (newResourceType === 'file' && file) {
                const formData = new FormData();
                formData.append('file', file);
                formData.append('title', newResourceTitle.trim() || file.name);
                formData.append('task_id', task.id.toString());

                await fetch(`${API_BASE}/projects/${project.id}/resources/upload`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
                    },
                    body: formData
                }).then(async (res) => {
                    if (!res.ok) throw new Error('Upload failed');
                    return res.json();
                });
            } else {
                const finalUrl = `https://${cleanUrl(newResourceUrl)}`;
                await api.post(`/projects/${project.id}/resources`, {
                    task_id: task.id,
                    title: newResourceTitle,
                    url: finalUrl,
                    type: 'link'
                });
            }
            setNewResourceTitle('');
            setNewResourceUrl('');
            setFile(null);
            fetchData();
            addToast("Resource added successfully", "success");
        } catch (err) {
            console.error(err);
            addToast("Failed to add resource.", "error");
        }
    };

    const handleAddChecklistItem = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!newChecklistItem.trim() || !task || !canEdit) return;
        try {
            const newItem = await api.post(`/tasks/${task.id}/checklist`, { content: newChecklistItem.trim() });
            setChecklist([...checklist, newItem]);
            setNewChecklistItem('');
        } catch (err) {
            console.error(err);
            addToast("Failed to add checklist item.", "error");
        }
    };

    const handleToggleChecklistItem = async (item: any) => {
        if (!canEdit) return;
        try {
            const updated = await api.patch(`/checklist-items/${item.id}`, { is_completed: !item.is_completed });
            if (!item.is_completed && item.is_stuck_resolver) {
                triggerCelebration();
                addToast("Micro-step complete! Getting you back to active status.", "success");
            }
            setChecklist(prev => prev.map(i => i.id === item.id ? updated : i));
            if (!item.is_completed && item.is_stuck_resolver) {
                setIsStuck(false);
                setShowStuckResolverBanner(false);
                setStuckPanelCollapsed(false);
                setChecklist(prev => prev.map(i => ({
                    ...i,
                    is_stuck_resolver: false,
                    is_completed: i.id === item.id ? true : i.is_completed
                })));
                 
                 setLocalTask(prev => prev ? { 
                     ...prev, 
                     is_stuck: false, 
                     status: 'doing',
                     subtasks: prev.subtasks?.map(s => ({ ...s, is_stuck_resolver: false }))
                 } : null);
                
                setTimeout(() => {
                    if (task) {
                        fetchData();
                        if (onTaskUpdate) {
                            api.get<Task>(`/tasks/${task.id}`).then(updatedTask => {
                                onTaskUpdate(updatedTask);
                            });
                        }
                    }
                }, 300);
            }
        } catch (err) {
            console.error(err);
            addToast("Failed to update item.", "error");
        }
    };

    const handleDeleteChecklistItem = async (itemId: number) => {
        if (!canEdit) return;
        try {
            await api.delete(`/checklist-items/${itemId}`);
            setChecklist(checklist.filter(i => i.id !== itemId));
        } catch (err) {
            console.error(err);
            addToast("Failed to delete item.", "error");
        }
    };

    const handleConvertToSubtask = async (item: any) => {
        if (!canEdit || !task) return;
        setLoading(true);
        try {
            await api.post(`/projects/${project.id}/tasks`, {
                project_id: project.id,
                team_id: task.team_id,
                title: item.content,
                parent_task_id: task.id,
                status: item.is_completed ? 'done' : 'todo',
                priority: 'P3'
            });
            await api.delete(`/checklist-items/${item.id}`);
            setChecklist(checklist.filter(i => i.id !== item.id));
            fetchData();
            if (onTaskUpdate) {
                const updatedTask = await api.get<Task>(`/tasks/${task.id}`);
                onTaskUpdate(updatedTask);
            }
            addToast("Converted checklist item to subtask", "success");
        } catch (err) {
            console.error(err);
            addToast("Failed to convert item.", "error");
        } finally {
            setLoading(false);
        }
    };

    const handlePriorityChange = async (newPriority: 'P1' | 'P2' | 'P3') => {
        if (!task || !canEdit) return;
        setLocalPriority(newPriority);
        try {
            const res = await api.updateTask(task.id, { priority: newPriority });
            if (onTaskUpdate && res.task) onTaskUpdate(res.task);
            addToast(`Priority updated to ${newPriority}`, "success");
        } catch (err) {
            console.error(err);
            setLocalPriority(task.priority || 'P3');
            addToast("Failed to update priority.", "error");
        }
    };

    const handleExportTask = () => {
        if (!task) return;
        const token = localStorage.getItem('auth_token');
        const url = `${API_BASE}/calendar/events/task-${task.id}/ics${token ? `?token=${token}` : ''}`;
        window.open(url, '_blank');
    };

    const handleArchiveTask = async () => {
        if (!task) return;
        if (!confirm("Are you sure you want to archive this task? It will be hidden from the board.")) return;
        setLoading(true);
        try {
            await api.delete(`/tasks/${task.id}`);
            addToast("Task archived successfully", "success");
            onClose();
            if (onTaskUpdate) {
                onTaskUpdate({ ...task, deleted_at: new Date().toISOString() });
            }
        } catch (err) {
            console.error(err);
            addToast("Failed to archive task.", "error");
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteTask = async () => {
        if (!task) return;
        if (!confirm("CRITICAL: Are you sure you want to PERMANENTLY delete this task? This cannot be undone.")) return;
        setLoading(true);
        try {
            await api.hardDeleteTask(task.id);
            addToast("Task permanently deleted", "success");
            onClose();
            if (onTaskUpdate) {
                onTaskUpdate({ ...task, id: -1 });
            }
        } catch (err) {
            console.error(err);
            addToast("Failed to delete task.", "error");
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen || !task || !localTask) return null;

    const StatusIcon = localTask.status === 'done' ? CheckCircle2 : (localTask.status === 'doing' ? ClockIcon : AlertCircle);
    const statusColor = localTask.status === 'done' ? 'text-green-500' : (localTask.status === 'doing' ? 'text-blue-500' : 'text-gray-400');

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[25000]">
            <div className={`bg-white rounded-xl shadow-xl w-full max-h-[90vh] flex flex-col md:flex-row overflow-hidden animate-in fade-in zoom-in duration-200 transition-all ${isStuck ? 'max-w-5xl' : 'max-w-3xl'}`}>
                {isStuck && (
                    <div className="w-full md:w-80 bg-amber-50 border-r border-amber-100 flex flex-col overflow-hidden animate-in slide-in-from-left duration-500">
                        <div className="p-4 bg-amber-500 text-white flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <AlertTriangle className="w-5 h-5" />
                                <h3 className="font-bold">Stuck Protocol</h3>
                            </div>
                            <button onClick={() => setStuckPanelCollapsed(!stuckPanelCollapsed)} className="p-1 hover:bg-amber-600 rounded transition-colors">
                                {stuckPanelCollapsed ? <Plus className="w-5 h-5" /> : <X className="w-5 h-5" />}
                            </button>
                        </div>
                        <div className="p-4 overflow-y-auto flex-1">
                            {(checklist.some(i => i.is_stuck_resolver && !i.is_completed) || localTask?.subtasks?.some(s => s.is_stuck_resolver && s.status !== 'done')) ? (
                                <div className="space-y-4 animate-in fade-in zoom-in duration-300">
                                    <div className={`space-y-4 ${stuckPanelCollapsed ? 'opacity-100' : 'p-2 rounded-xl bg-amber-50/30'}`}>
                                        <div className="bg-white p-4 rounded-xl border-2 border-amber-200 shadow-sm">
                                            <div className="flex items-center justify-between mb-2">
                                                <h4 className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">Active Micro-Step(s)</h4>
                                                <AlertTriangle className="w-3 h-3 text-amber-500 animate-pulse" />
                                            </div>
                                            <div className="space-y-2 mb-3">
                                                {checklist.filter(i => i.is_stuck_resolver && !i.is_completed).map(item => (
                                                    <p key={item.id} className="text-sm font-bold text-amber-900 leading-tight flex items-start gap-1.5">
                                                        <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                                                        {item.content.replace('NEXT: ', '')}
                                                    </p>
                                                ))}
                                                {localTask?.subtasks?.filter(s => s.is_stuck_resolver && s.status !== 'done').map(sub => (
                                                    <p key={sub.id} className="text-sm font-bold text-amber-900 leading-tight flex items-start gap-1.5">
                                                        <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                                                        {sub.title}
                                                    </p>
                                                ))}
                                            </div>
                                            <div className="p-2 py-2.5 bg-amber-50 rounded-lg text-[10px] text-amber-700 font-medium border border-amber-100/50">
                                                <span className="font-bold">Next step:</span> Complete { (checklist.filter(i => i.is_stuck_resolver && !i.is_completed).length + (localTask?.subtasks?.filter(s => s.is_stuck_resolver && s.status !== 'done').length || 0)) > 1 ? 'any of these items' : 'this item' } to get unstuck!
                                            </div>
                                        </div>
                                        {!stuckPanelCollapsed && (
                                            <button onClick={() => { setStuckStep(1); setShowStuckResolverBanner(false); }} className="w-full py-2 text-[10px] font-bold text-amber-600 hover:text-amber-700 hover:bg-amber-100/50 rounded-lg border border-amber-200 border-dashed transition-all">
                                                Switch to a different strategy
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div className="flex items-center mb-6">
                                        <div className={`flex items-center justify-center w-6 h-6 rounded-full font-bold text-[10px] ${stuckStep >= 1 ? 'bg-amber-500 text-white' : 'bg-gray-200 text-gray-400'}`}>1</div>
                                        <div className={`flex-1 h-0.5 mx-1 rounded ${stuckStep >= 2 ? 'bg-amber-500' : 'bg-gray-200'}`}></div>
                                        <div className={`flex items-center justify-center w-6 h-6 rounded-full font-bold text-[10px] ${stuckStep >= 2 ? 'bg-amber-500 text-white' : 'bg-gray-200 text-gray-400'}`}>2</div>
                                        <div className={`flex-1 h-0.5 mx-1 rounded ${stuckStep >= 3 ? 'bg-amber-500' : 'bg-gray-200'}`}></div>
                                        <div className={`flex items-center justify-center w-6 h-6 rounded-full font-bold text-[10px] ${stuckStep >= 3 ? 'bg-amber-500 text-white' : 'bg-gray-200 text-gray-400'}`}>3</div>
                                    </div>
                                    {stuckStep === 1 && (
                                        <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                                            {stuckLogs.length > 0 && (
                                                <div className="p-3 bg-amber-100/50 border border-amber-200 rounded-lg animate-pulse text-[10px] text-amber-800 font-medium leading-relaxed">
                                                    <span className="font-bold flex items-center gap-1 mb-1"><AlertTriangle className="w-3 h-3" /> Still stuck?</span>
                                                    You've encountered blocks on this task {stuckLogs.length} time{stuckLogs.length > 1 ? 's' : ''} before. Try a different strategy or ping your teacher if the micro-steps aren't helping.
                                                </div>
                                            )}
                                            <h4 className="text-sm font-bold text-amber-900">Why are you stuck?</h4>
                                            <div className="grid grid-cols-1 gap-2">
                                                {Object.entries(ACTION_TREE).map(([id, node]: [string, any]) => (
                                                    <button key={id} onClick={() => { setStuckReason(id); setStuckStep(2); }} className="text-left w-full p-2.5 rounded-lg border border-amber-200 bg-white hover:border-amber-400 hover:bg-amber-100 transition-all text-xs font-medium text-amber-900 group flex items-center justify-between">
                                                        {node.title}
                                                        <ArrowRight className="w-3 h-3 text-amber-400 group-hover:translate-x-1 transition-transform" />
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    {stuckStep === 2 && stuckReason && (
                                        <div className="space-y-4 animate-in fade-in slide-in-from-right-2">
                                            <button onClick={() => setStuckStep(1)} className="text-[10px] text-amber-600 hover:underline">&larr; Change category</button>
                                            <h4 className="text-sm font-bold text-amber-900">Choose an action:</h4>
                                            <div className="space-y-2">
                                                {ACTION_TREE[stuckReason as keyof typeof ACTION_TREE].options.map(opt => (
                                                    <button key={opt.id} onClick={() => handleStuckActionSelect(opt)} className="text-left w-full p-2.5 rounded-lg border border-amber-200 bg-white hover:border-amber-400 hover:bg-amber-100 transition-all flex items-start group">
                                                        <div className="flex items-center justify-center w-4 h-4 rounded-full bg-amber-100 text-amber-800 font-bold text-[10px] mr-2 shrink-0 mt-0.5">{opt.id}</div>
                                                        <span className="text-[11px] font-medium text-amber-900">{opt.text}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    {stuckStep === 3 && (
                                        <div className="space-y-4 animate-in fade-in slide-in-from-right-2 text-center">
                                            <button onClick={() => {
                                                if (stuckReason === '2' && stuckActionId === 'A' && stuckSubStep !== 'rewrite') {
                                                    if (stuckSubStep === 'action') setStuckSubStep('rewrite');
                                                    else if (stuckSubStep === 'checkin') setStuckSubStep('action');
                                                    else if (stuckSubStep === 'pinging') setStuckSubStep('checkin');
                                                } else {
                                                    setStuckStep(2);
                                                }
                                            }} className="text-[10px] text-amber-600 hover:underline">&larr; Back</button>
                                            
                                            {stuckReason === '2' && stuckActionId === 'A' ? (
                                                <div className="space-y-4 text-left">
                                                    {stuckSubStep === 'rewrite' && (
                                                        <div className="animate-in fade-in duration-300">
                                                            <div className="bg-amber-50 p-3 rounded-lg border border-amber-200 mb-3 flex gap-3 items-start">
                                                                <div className="bg-amber-500 p-1.5 rounded text-white shrink-0">
                                                                    <Pencil className="w-3.5 h-3.5" />
                                                                </div>
                                                                <p className="text-amber-900 text-[11px] leading-tight">Sometimes simply rephrasing the goal helps you see the next step. Try it now:</p>
                                                            </div>
                                                            <h4 className="text-xs font-bold text-gray-900 mb-3">What are you trying to accomplish in 1 sentence?</h4>
                                                            <textarea
                                                                value={rephrasedText}
                                                                onChange={(e) => setRephrasedText(e.target.value)}
                                                                placeholder="Avoid using jargon. Imagine explaining it to a friend..."
                                                                className="w-full p-3 rounded-lg border border-amber-200 focus:ring-1 focus:ring-amber-500 outline-none resize-none min-h-[100px] text-sm text-gray-800"
                                                                autoFocus
                                                            />
                                                            <button
                                                                onClick={() => setStuckSubStep('action')}
                                                                disabled={!rephrasedText.trim()}
                                                                className="w-full mt-4 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white rounded-lg font-bold text-xs flex items-center justify-center transition-all shadow-sm"
                                                            >
                                                                Continue <ArrowRight className="w-3 h-3 ml-2" />
                                                            </button>
                                                        </div>
                                                    )}

                                                    {stuckSubStep === 'action' && (
                                                        <div className="animate-in fade-in slide-in-from-right-2 duration-300">
                                                            <div className="bg-white p-4 rounded-xl border border-amber-100 shadow-sm mb-4">
                                                                <h4 className="text-[10px] font-black uppercase text-amber-500 tracking-wider mb-2">Your New Goal:</h4>
                                                                <p className="text-sm font-bold text-amber-900 italic leading-snug">"{rephrasedText}"</p>
                                                            </div>
                                                            <h4 className="text-sm font-black text-gray-900 mb-4">Does this feel more manageable now?</h4>
                                                            
                                                            <div className="grid grid-cols-1 gap-2 border-b border-gray-100 pb-4 mb-4">
                                                                <button 
                                                                    onClick={handleStuckSubmit}
                                                                    className="p-3 rounded-xl border border-gray-100 hover:border-emerald-500 hover:bg-emerald-50 transition-all text-left flex items-center gap-3 group"
                                                                >
                                                                    <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                                                                    <div>
                                                                        <span className="block font-bold text-gray-900 text-xs">Yes, I'm ready to keep going!</span>
                                                                        <span className="text-[10px] text-gray-500 block italic">Mark me as unstuck</span>
                                                                    </div>
                                                                </button>
                                                                
                                                                <button 
                                                                    onClick={() => {
                                                                        const taskTitle = task?.title || 'this task';
                                                                        const projectTitle = project?.title || 'this project';
                                                                        const draft = `Hi! I'm stuck on "${taskTitle}" for ${projectTitle}. I tried to rephrase the goal as: "${rephrasedText}", but I still need help with... `;
                                                                        setStuckNextActionText(draft);
                                                                        setStuckSubStep('pinging');
                                                                    }}
                                                                    className="text-xs font-bold text-amber-600 hover:text-amber-700 underline px-4 py-2 bg-amber-50 rounded-lg w-full transition-all"
                                                                >
                                                                    No, I'm still stuck. Ask my teacher for help.
                                                                </button>
                                                            </div>

                                                            <div className="pt-2 border-t border-gray-100">
                                                                <p className="text-[10px] text-gray-500 mb-3 text-center">If it did, let's make it actionable:</p>
                                                            </div>
                                                            <div className="grid grid-cols-1 gap-2">
                                                                <button 
                                                                    onClick={handleCreateStuckChecklist}
                                                                    className="p-3 rounded-xl border border-gray-100 hover:border-indigo-500 hover:bg-indigo-50 transition-all text-left flex items-center gap-3 group"
                                                                >
                                                                    <ListChecks className="w-5 h-5 text-indigo-500 shrink-0" />
                                                                    <div>
                                                                        <span className="block font-bold text-gray-900 text-xs">Add as Checklist Item</span>
                                                                        <span className="text-[10px] text-gray-500 block">A small step in this task</span>
                                                                    </div>
                                                                </button>
                                                                <button 
                                                                    onClick={handleCreateStuckSubtask}
                                                                    className="p-3 rounded-xl border border-gray-100 hover:border-indigo-500 hover:bg-indigo-50 transition-all text-left flex items-center gap-3 group"
                                                                >
                                                                    <Plus className="w-5 h-5 text-indigo-500 shrink-0" />
                                                                    <div>
                                                                        <span className="block font-bold text-gray-900 text-xs">Add as Subtask</span>
                                                                        <span className="text-[10px] text-gray-500 block">A new task for the project</span>
                                                                    </div>
                                                                </button>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {stuckSubStep === 'checkin' && (
                                                        <div className="animate-in zoom-in-95 duration-500 text-center py-8">
                                                            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-emerald-200">
                                                                <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                                                            </div>
                                                            <h4 className="text-sm font-black text-gray-900 mb-2">Resolver Created!</h4>
                                                            <p className="text-[11px] text-gray-600 mb-6 leading-relaxed">
                                                                Great move. We've added your rephrased goal as a new step. Check the Task Checklist to see it!
                                                            </p>
                                                            <button 
                                                                onClick={() => setStuckPanelCollapsed(true)}
                                                                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-[10px] uppercase tracking-widest shadow-lg transition-all"
                                                            >
                                                                Let's get to work!
                                                            </button>
                                                        </div>
                                                    )}

                                                    {stuckSubStep === 'pinging' && (
                                                        <div className="animate-in fade-in duration-300">
                                                            <h4 className="text-xs font-bold text-gray-900 mb-1 text-center">Reach out for help</h4>
                                                            <p className="text-[10px] text-gray-600 text-center mb-4 leading-tight">
                                                                Your rephrase will help others understand where to jump in.
                                                            </p>
                                                            <div className="bg-amber-50 p-2 rounded-lg border border-amber-200 mb-4">
                                                                <textarea
                                                                    value={stuckNextActionText}
                                                                    onChange={(e) => setStuckNextActionText(e.target.value)}
                                                                    className="w-full p-2 text-xs rounded border border-amber-200 focus:ring-1 focus:ring-amber-500 outline-none resize-none m-0"
                                                                    rows={5}
                                                                    autoFocus
                                                                />
                                                            </div>
                                                            <button
                                                                onClick={handleStuckSubmit}
                                                                disabled={loading}
                                                                className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-bold text-xs flex items-center justify-center transition-all shadow-sm"
                                                            >
                                                                Send Draft <Send className="w-3 h-3 ml-2" />
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            ) : stuckReason === '2' && stuckActionId === 'B' ? (
                                                <div className="space-y-4 text-left">
                                                    {stuckSubStep === 'write_question' && (
                                                        <div className="animate-in fade-in duration-300">
                                                            <div className="bg-amber-50 p-3 rounded-lg border border-amber-200 mb-3 flex gap-3 items-start">
                                                                <div className="bg-amber-500 p-1.5 rounded text-white shrink-0">
                                                                    <div className="text-[10px] font-bold">Q?</div>
                                                                </div>
                                                                <p className="text-amber-900 text-[11px] leading-tight">To clear a content block, we need a focused question to investigate.</p>
                                                            </div>
                                                            <h4 className="text-xs font-bold text-gray-900 mb-3">What's one question you need answered to move forward?</h4>
                                                            <textarea
                                                                value={stuckQuestion}
                                                                onChange={(e) => setStuckQuestion(e.target.value)}
                                                                placeholder="e.g., How do I format the APA citation for a website?"
                                                                className="w-full p-3 rounded-lg border border-amber-200 focus:ring-1 focus:ring-amber-500 outline-none resize-none min-h-[100px] text-sm text-gray-800"
                                                                autoFocus
                                                            />
                                                            <button
                                                                onClick={() => setStuckSubStep('choose_timer')}
                                                                disabled={!stuckQuestion.trim()}
                                                                className="w-full mt-4 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white rounded-lg font-bold text-xs flex items-center justify-center transition-all shadow-sm"
                                                            >
                                                                Continue <ArrowRight className="w-3 h-3 ml-2" />
                                                            </button>
                                                        </div>
                                                    )}

                                                    {stuckSubStep === 'choose_timer' && (
                                                        <div className="animate-in fade-in slide-in-from-right-2 duration-300 text-center">
                                                            <div className="bg-amber-50 p-2 rounded-lg border border-amber-200 mb-4 italic text-[10px] text-amber-800">
                                                                "{stuckQuestion}"
                                                            </div>
                                                            
                                                            <h4 className="text-sm font-black text-gray-900 mb-1 text-center">Set a research timer</h4>
                                                            <label className="text-[10px] text-amber-600 mb-2 font-bold uppercase tracking-tight block">What will you look for?</label>
                                                            
                                                            <input 
                                                               type="text"
                                                               value={stuckResearchIntent}
                                                               onChange={(e) => setStuckResearchIntent(e.target.value)}
                                                               placeholder="e.g., A definition, a specific image, the due date..."
                                                               className="w-full p-2.5 rounded-lg border border-amber-200 focus:ring-1 focus:ring-amber-500 outline-none text-xs text-gray-800 mb-6 bg-white shadow-sm"
                                                               autoFocus
                                                            />

                                                            <p className="text-[11px] text-gray-600 mb-6 leading-tight flex flex-col gap-1 items-center">
                                                                <span>Some questions are easier than others.</span>
                                                                <span className="font-bold text-gray-900">How much time do you need to find an answer?</span>
                                                            </p>
                                                            <div className="grid grid-cols-3 gap-3">
                                                                {[1, 3, 5].map(mins => (
                                                                    <button
                                                                        key={mins}
                                                                        onClick={() => {
                                                                            setTimeLeft(mins * 60);
                                                                            setIsTimerRunning(true);
                                                                            setStuckSubStep('countdown');
                                                                        }}
                                                                        disabled={!stuckResearchIntent.trim()}
                                                                        className="p-4 rounded-xl border border-amber-200 hover:border-amber-500 hover:bg-amber-100 disabled:opacity-50 transition-all flex flex-col items-center gap-1 group"
                                                                    >
                                                                        <span className="text-xl font-black text-amber-600 group-hover:scale-110 transition-transform">{mins}</span>
                                                                        <span className="text-[10px] uppercase font-bold text-amber-500">Min</span>
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {stuckSubStep === 'countdown' && (
                                                        <div className="animate-in zoom-in-95 duration-500 text-center py-4">
                                                            <div className="relative inline-flex items-center justify-center mb-6">
                                                                <div className="w-32 h-32 rounded-full border-8 border-amber-100 flex items-center justify-center relative">
                                                                    <div className="absolute inset-0 rounded-full border-8 border-amber-500 border-t-transparent animate-[spin_3s_linear_infinite]"></div>
                                                                    <div className="text-3xl font-black text-amber-900 tabular-nums">
                                                                        {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <h4 className="text-sm font-bold text-amber-900 mb-2 text-center">Research Time!</h4>
                                                            <p className="text-[11px] text-amber-700 mb-6 leading-relaxed bg-amber-50 p-3 rounded-lg border border-amber-100 max-w-xs mx-auto">
                                                                Open your notes or project resources and look for: <br/> 
                                                                <span className="font-bold italic mt-1 block">"{stuckResearchIntent}"</span>
                                                                <span className="text-[9px] text-amber-500 block mt-2">To answer: "{stuckQuestion}"</span>
                                                            </p>
                                                            <button 
                                                                onClick={() => { setIsTimerRunning(false); setStuckSubStep('self_answer'); }}
                                                                className="text-xs font-bold text-amber-600 hover:text-amber-700 underline"
                                                            >
                                                                I found it early!
                                                            </button>
                                                        </div>
                                                    )}

                                                    {stuckSubStep === 'self_answer' && (
                                                        <div className="animate-in fade-in duration-300">
                                                            <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                                                <Pencil className="w-6 h-6 text-amber-600" />
                                                            </div>
                                                            <h4 className="text-sm font-black text-gray-900 mb-1 text-center">What did you find? (1 sentence)</h4>
                                                            <p className="text-[10px] text-gray-500 mb-3 text-center italic">Doesn't have to be perfect, just jot it down.</p>
                                                            <div className="bg-amber-50 p-2 rounded-lg border border-amber-100 mb-4 italic text-[11px] text-amber-800 text-center">
                                                                "{stuckQuestion}"
                                                            </div>
                                                            <textarea
                                                                value={stuckAnswer}
                                                                onChange={(e) => setStuckAnswer(e.target.value)}
                                                                placeholder="Try to answer it as simply as possible..."
                                                                className="w-full p-3 rounded-lg border border-amber-200 focus:ring-1 focus:ring-amber-500 outline-none resize-none min-h-[100px] text-sm text-gray-800"
                                                                autoFocus
                                                            />
                                                            <button
                                                                onClick={() => {
                                                                    setStuckNextActionText(""); // Clear for next step
                                                                    setStuckSubStep('next_step');
                                                                }}
                                                                disabled={!stuckAnswer.trim()}
                                                                className="w-full mt-4 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white rounded-lg font-bold text-xs flex items-center justify-center transition-all shadow-sm"
                                                            >
                                                                Continue <ArrowRight className="w-3 h-3 ml-2" />
                                                            </button>
                                                        </div>
                                                    )}

                                                     {stuckSubStep === 'next_step' && (
                                                        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                                                            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                                                <ListChecks className="w-6 h-6 text-green-600" />
                                                            </div>
                                                            <h4 className="text-sm font-black text-gray-900 mb-1 text-center">Based on that, what's your next step?</h4>
                                                            <p className="text-[10px] text-gray-500 mb-4 text-center">Now that you have an answer, how will you start?</p>
                                                            
                                                            <textarea
                                                                value={stuckNextActionText}
                                                                onChange={(e) => setStuckNextActionText(e.target.value)}
                                                                placeholder="e.g., Update the intro paragraph... "
                                                                className="w-full p-3 rounded-lg border border-amber-200 focus:ring-1 focus:ring-amber-500 outline-none resize-none min-h-[80px] text-sm text-gray-800 mb-4"
                                                                autoFocus
                                                            />

                                                            <div className="flex flex-col gap-2">
                                                                <button 
                                                                    onClick={() => {
                                                                        setStuckResolutionType('checklist');
                                                                        handleStuckSubmit();
                                                                    }}
                                                                    disabled={!stuckNextActionText.trim()}
                                                                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg font-bold text-xs shadow-sm transition-all flex items-center justify-center"
                                                                >
                                                                    <Plus className="w-3 h-3 mr-2" /> Create checklist item
                                                                </button>
                                                                <button 
                                                                    onClick={() => {
                                                                        setStuckResolutionType(null); // Immediate unstick
                                                                        handleStuckSubmit();
                                                                    }}
                                                                    disabled={!stuckNextActionText.trim()}
                                                                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg font-bold text-xs shadow-sm transition-all"
                                                                >
                                                                    Getting to work!
                                                                </button>
                                                                <button 
                                                                    onClick={() => {
                                                                        const taskTitle = task?.title || 'this task';
                                                                        const projectTitle = project?.title || 'this project';
                                                                        const draft = `Hi! I'm stuck on "${taskTitle}" for ${projectTitle}. I tried to research the question "${stuckQuestion}" and tentatively found: "${stuckAnswer}", but I'm still not 100% sure and need help. Next step I tried to plan: "${stuckNextActionText}"`;
                                                                        setStuckNextActionText(draft);
                                                                        setStuckSubStep('pinging');
                                                                    }}
                                                                    className="w-full py-2 text-gray-500 hover:text-amber-600 text-[10px] font-bold transition-all underline"
                                                                >
                                                                    Still stuck... I need help
                                                                </button>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {stuckSubStep === 'pinging' && (
                                                        <div className="animate-in fade-in duration-300">
                                                            <h4 className="text-xs font-bold text-gray-900 mb-1 text-center">Reach out for help</h4>
                                                            <p className="text-[10px] text-gray-600 text-center mb-4 leading-tight">
                                                                Sharing your research helps your teacher/team support you better.
                                                            </p>
                                                            <div className="bg-amber-50 p-2 rounded-lg border border-amber-200 mb-4">
                                                                <textarea
                                                                    value={stuckNextActionText}
                                                                    onChange={(e) => setStuckNextActionText(e.target.value)}
                                                                    className="w-full p-2 text-xs rounded border border-amber-200 focus:ring-1 focus:ring-amber-500 outline-none resize-none m-0"
                                                                    rows={5}
                                                                    autoFocus
                                                                />
                                                            </div>
                                                            <button
                                                                onClick={handleStuckSubmit}
                                                                disabled={loading}
                                                                className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-bold text-xs flex items-center justify-center transition-all shadow-sm"
                                                            >
                                                                Send Research Pack <Send className="w-3 h-3 ml-2" />
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                /* STANDARD FLOW */
                                                <>
                                                    {((stuckReason === "1" && stuckActionId === "B") || (stuckReason === "5" && stuckActionId === "A")) ? (
                                                        <div className="space-y-3 text-left">
                                                            <div className="p-3 bg-amber-100/50 rounded-lg border border-amber-200">
                                                                <h5 className="text-[10px] font-bold text-amber-900 uppercase mb-2">Break it down:</h5>
                                                                <div className="space-y-2">
                                                                    {stuckSteps.map((s, idx) => (
                                                                        <input key={idx} value={s} onChange={(e) => {
                                                                            const newSteps = [...stuckSteps];
                                                                            newSteps[idx] = e.target.value;
                                                                            setStuckSteps(newSteps);
                                                                        }} placeholder={`Step ${idx + 1}...`} className="w-full p-2 text-xs rounded border border-amber-200 focus:ring-1 focus:ring-amber-500 outline-none" />
                                                                    ))}
                                                                </div>
                                                            </div>
                                                            <div className="grid grid-cols-2 gap-2">
                                                                <button onClick={() => setStuckResolutionType('checklist')} className={`p-2 rounded-lg border text-[10px] font-bold transition-all ${stuckResolutionType === 'checklist' ? 'bg-amber-500 text-white border-amber-600' : 'bg-white text-amber-700 border-amber-200'}`}>
                                                                    Checklist
                                                                </button>
                                                                <button onClick={() => setStuckResolutionType('subtask')} className={`p-2 rounded-lg border text-[10px] font-bold transition-all ${stuckResolutionType === 'subtask' ? 'bg-amber-500 text-white border-amber-600' : 'bg-white text-amber-700 border-amber-200'}`}>
                                                                    Subtasks
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="p-3 bg-white rounded-lg border border-amber-200 text-left">
                                                            <label className="block text-[10px] font-bold text-amber-900 mb-1">
                                                                {ACTION_TREE[stuckReason as keyof typeof ACTION_TREE].options.find(o => o.id === stuckActionId)?.text.includes('Ping') ? 'Write your message:' : 'Write your commit (1 sentence):'}
                                                            </label>
                                                            <textarea value={stuckNextActionText} onChange={(e) => setStuckNextActionText(e.target.value)} placeholder="..." className="w-full p-2 text-xs rounded border border-amber-200 focus:ring-1 focus:ring-amber-500 outline-none resize-none" rows={3} autoFocus></textarea>
                                                            
                                                            {ACTION_TREE[stuckReason as keyof typeof ACTION_TREE].options.find(o => o.id === stuckActionId)?.text.includes('Ping') && (
                                                                <div className="mt-2 flex items-center gap-1.5 px-2 py-1.5 bg-amber-50 rounded border border-amber-100 italic">
                                                                    {ACTION_TREE[stuckReason as keyof typeof ACTION_TREE].options.find(o => o.id === stuckActionId)?.text.includes('Teacher') ? (
                                                                        <>
                                                                            <span className="text-[10px]">🎓</span>
                                                                            <span className="text-[10px] font-bold text-amber-700">Private alert to your teacher</span>
                                                                        </>
                                                                    ) : (
                                                                        <>
                                                                            <span className="text-[10px]">👥</span>
                                                                            <span className="text-[10px] font-bold text-amber-700">Alerts your team and teacher</span>
                                                                        </>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                    <button onClick={handleStuckSubmit} disabled={loading || (((stuckReason === "1" && stuckActionId === "B") || (stuckReason === "5" && stuckActionId === "A")) ? !stuckSteps.every(s => s.trim()) : !stuckNextActionText.trim())} className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-200 text-white rounded-lg font-bold text-xs transition-all flex items-center justify-center gap-2">
                                                        Commit & Proceed
                                                        <ClockIcon className="w-3 h-3" />
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                )}

                <div key={localTask.id} className={`flex-1 flex flex-col overflow-hidden animate-in fade-in duration-500 ${navDirection === 'forward' ? 'slide-in-from-right-8' : navDirection === 'backward' ? 'slide-in-from-left-8' : ''}`}>
                    <div className="flex justify-between items-start p-6 border-b border-gray-100 bg-gray-50/50">
                        <div className="flex gap-4 items-start">
                            <div className={`p-2 rounded-lg bg-white shadow-sm border border-gray-100 ${statusColor}`}>
                                <StatusIcon className="w-6 h-6" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2 mb-1"> 
                                    <h2 className="text-xl font-bold text-gray-900 leading-tight">{localTask.title}</h2>
                                    <span className="text-gray-400 text-xs">#{localTask.id}</span>
                                    <span className="text-[10px] text-gray-300 font-mono ml-2">PID: #{localTask.project_id}</span>
                                </div>
                                <div className="flex items-center gap-3 text-sm text-gray-500">
                                    <span className="capitalize font-medium text-gray-700">{localTask.status.replace('_', ' ')}</span>
                                    {localTask.assignee_id ? (
                                        <span>Assignee: {localTask.assignee_name || `User ${localTask.assignee_id}`}</span>
                                    ) : (
                                        onTaskClaim && (
                                            <button onClick={() => onTaskClaim(localTask.id)} className="text-xs font-bold uppercase tracking-wider bg-indigo-50 text-indigo-600 hover:bg-indigo-100 px-2 py-1 rounded">Claim Task</button>
                                        )
                                    )}
                                </div>
                                {history.length > 0 && (
                                    <div className="mt-4">
                                        <button onClick={handleBack} className="group flex items-center gap-2 px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg transition-all text-[11px] font-bold border border-indigo-200 shadow-sm">
                                            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
                                            Return to: {history[history.length - 1].title}
                                        </button> 
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {canEdit && (
                                <button onClick={() => onEditTask?.(localTask)} className="px-3 py-1.5 text-sm font-medium text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors flex items-center">
                                    <Pencil className="w-4 h-4 mr-1" /> Edit
                                </button>
                            )}
                            <button onClick={handleClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors ml-2 border-l border-gray-200">
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                    </div>

                    {showStuckResolverBanner && (
                        <div className="bg-amber-500 text-white px-6 py-2 flex items-center justify-between animate-in slide-in-from-top duration-300">
                            <div className="flex items-center gap-2 text-sm font-medium">
                                <ClockIcon className="w-4 h-4" />
                                <span>Now do this one thing, and then we will mark you as unstuck!</span>
                            </div>
                            <button onClick={() => setShowStuckResolverBanner(false)} className="hover:bg-amber-600 p-1 rounded"><X className="w-4 h-4" /></button>
                        </div>
                    )}

                    <div className="flex border-b border-gray-200 px-6 pt-2 items-center">
                        <div className="flex items-center">
                            <button onClick={() => setActiveTab('overview')} className={`px-4 py-3 text-sm font-medium border-b-2 ${activeTab === 'overview' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>Overview</button>
                            {(project.requires_reflection || project.requires_milestone_reflection) && (
                                <button onClick={() => setActiveTab('reflections')} className={`px-4 py-3 text-sm font-medium border-b-2 ${activeTab === 'reflections' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>Reflections</button>
                            )}
                            {stuckLogs.length > 0 && (
                                <button onClick={() => setActiveTab('stuck-history')} className={`px-4 py-3 text-sm font-medium border-b-2 flex items-center gap-2 ${activeTab === 'stuck-history' ? 'border-amber-500 text-amber-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                                    Stuck History <span className="bg-amber-100 text-amber-800 text-[10px] px-1.5 py-0.5 rounded-full">{stuckLogs.length}</span>
                                </button>
                            )}
                            <button onClick={() => setActiveTab('resources')} className={`px-4 py-3 text-sm font-medium border-b-2 ${activeTab === 'resources' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>Resources</button>
                            {(task?.is_stuck || messages.length > 0) && (
                                <button onClick={() => setActiveTab('messages')} className={`px-4 py-3 text-sm font-medium border-b-2 flex items-center gap-2 ${activeTab === 'messages' ? 'border-amber-500 text-amber-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                                    Discussion {messages.length > 0 && <span className="bg-amber-100 text-amber-800 text-[10px] px-1.5 py-0.5 rounded-full">{messages.length}</span>}
                                </button>
                            )}
                        </div>
                        
                        {isOwner && (
                            <div className="ml-auto flex items-center pb-2">
                                <button 
                                    onClick={handleToggleStuck} 
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                                        isStuck 
                                        ? 'bg-amber-500 text-white border-amber-600 shadow-sm' 
                                        : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                                    }`}
                                >
                                    <AlertTriangle className={`w-3.5 h-3.5 ${isStuck ? 'text-white' : 'text-gray-400'}`} />
                                    {isStuck ? 'STUCK' : 'Mark Stuck'}
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
                        {activeTab === 'overview' && (
                            <div className="space-y-6">
                                {(checklist.some(i => i.is_stuck_resolver && !i.is_completed) || localTask?.subtasks?.some(s => s.is_stuck_resolver && s.status !== 'done')) && (
                                    <div className="bg-amber-100 border border-amber-200 p-4 rounded-xl shadow-sm flex items-start gap-4 animate-in slide-in-from-top-4 duration-500">
                                        <div className="bg-amber-500 p-2 rounded-lg text-white shadow-sm">
                                            <AlertTriangle className="w-5 h-5" />
                                        </div>
                                        <div className="flex-1">
                                            <h4 className="text-amber-900 font-bold text-sm">Your Current Focusing Point</h4>
                                            <p className="text-amber-800 text-xs mt-1">
                                                To get back to full speed, focus on finishing at least one of the <b>Stuck Resolvers</b> below. 
                                                Once you do, you'll be automatically marked as active again!
                                            </p>
                                        </div>
                                    </div>
                                )}
                                <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                                    <h3 className="text-sm font-semibold text-gray-900 mb-2 uppercase tracking-wider">Description</h3>
                                    <p className="text-gray-600 whitespace-pre-wrap text-sm leading-relaxed">{localTask.description || "No description provided."}</p>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="bg-white p-4 justify-between flex items-center rounded-xl border border-gray-100 shadow-sm">
                                        <span className="text-sm text-gray-500">Start Date</span>
                                        <span className="font-medium text-gray-900">{localTask.start_date ? localTask.start_date.substring(0, 10) : '-'}</span>
                                    </div>
                                    <div className="bg-white p-4 justify-between flex items-center rounded-xl border border-gray-100 shadow-sm">
                                        <span className="text-sm text-gray-500">Due Date</span>
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium text-gray-900">{localTask.due_date ? localTask.due_date.substring(0, 10) : '-'}</span>
                                            {isOwner && localTask.due_date && (
                                                <button onClick={handleExportTask} className="p-1.5 text-gray-400 hover:text-indigo-600 transition-all"><Download size={14} /></button>
                                            )}
                                        </div>
                                    </div>
                                    <div className="bg-white p-4 justify-between flex items-center rounded-xl border border-gray-100 shadow-sm">
                                        <span className="text-sm text-gray-500">Priority</span>
                                        {canEdit ? (
                                            <select value={localPriority} onChange={(e) => handlePriorityChange(e.target.value as any)} className="text-sm font-bold px-2 py-1 rounded border border-gray-200 bg-gray-50">
                                                <option value="P1">P1 - Critical</option>
                                                <option value="P2">P2 - High</option>
                                                <option value="P3">P3 - Normal</option>
                                            </select>
                                        ) : (
                                            <span className="text-sm font-bold px-2 py-1 rounded bg-gray-50">{localPriority}</span>
                                        )}
                                    </div>
                                </div>

                                <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2"><ListChecks className="w-4 h-4 text-indigo-500" /> Task Checklist</h3>
                                    </div>
                                    <div className="space-y-3">
                                        {checklist.map((item: TaskChecklistItem) => (
                                            <div key={item.id} className={`group flex items-center gap-3 p-3 rounded-xl border transition-all ${item.is_stuck_resolver && !item.is_completed ? 'bg-amber-50 border-amber-200 scale-[1.01]' : 'border-transparent hover:bg-gray-50'}`}>
                                                <button onClick={() => handleToggleChecklistItem(item)} disabled={!canEdit} className={`shrink-0 ${item.is_completed ? 'text-green-500' : 'text-gray-300'}`}>
                                                    {item.is_completed ? <CheckSquare className="w-6 h-6" /> : <Square className="w-6 h-6" />}
                                                </button>
                                                <span className={`flex-1 text-sm ${item.is_completed ? 'text-gray-400 line-through' : 'text-gray-700'} ${item.is_stuck_resolver && !item.is_completed ? 'font-bold' : ''}`}>
                                                    {item.is_stuck_resolver && !item.is_completed && (
                                                        <span className="inline-block bg-amber-500 text-white text-[9px] px-1.5 py-0.5 rounded mr-2 uppercase font-black">Stuck Resolver</span>
                                                    )}
                                                    {item.content}
                                                </span>
                                                {canEdit && (
                                                    <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1">
                                                        <button onClick={() => handleConvertToSubtask(item)} className="p-1 text-gray-400 hover:text-indigo-600"><ExternalLink className="w-4 h-4" /></button>
                                                        <button onClick={() => handleDeleteChecklistItem(item.id)} className="p-1 text-gray-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                        {canEdit && (
                                            <form onSubmit={handleAddChecklistItem} className="mt-2">
                                                <input type="text" value={newChecklistItem} onChange={(e) => setNewChecklistItem(e.target.value)} placeholder="Add a step..." className="w-full text-sm p-2 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-indigo-500" />
                                            </form>
                                        )}
                                    </div>
                                </div>

                                {history.length === 0 && (
                                    <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                                        <SubtaskList parentTask={localTask} project={project} subtasks={localTask.subtasks || []} onTaskClick={handleSubtaskClick} onSubtaskUpdate={fetchData} canEdit={canEdit} />
                                    </div>
                                )}

                                {(canEdit || isTeacher) && (
                                    <div className="mt-8 pt-6 border-t border-gray-100 flex gap-3">
                                        <button onClick={handleArchiveTask} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-amber-700 bg-amber-50 border border-amber-100 rounded-lg"><Archive className="w-4 h-4" /> Archive</button>
                                        {isTeacher && (
                                            <button onClick={handleDeleteTask} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-700 bg-red-50 border border-red-100 rounded-lg"><Trash2 className="w-4 h-4" /> Delete</button>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'reflections' && (
                            <div className="space-y-6">
                                <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                                    <h3 className="text-sm font-semibold text-gray-900 mb-4 uppercase tracking-wider">Reflection Log</h3>
                                    <div className="space-y-4">
                                        {reflections.map(ref => (
                                            <div key={ref.id} className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                                                <div className="flex justify-between items-center mb-2">
                                                    <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest">{ref.transition_type?.replace('_', ' ')}</span>
                                                    <span className="text-xs text-gray-400">{ref.created_at ? new Date(ref.created_at).toLocaleString() : ''}</span>
                                                </div>
                                                <p className="text-gray-600 text-sm whitespace-pre-wrap">{ref.content}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <form onSubmit={handleAddReflection} className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                                    <textarea value={newReflection} onChange={(e) => setNewReflection(e.target.value)} placeholder="Add a reflection..." className="w-full text-sm p-3 border border-gray-200 rounded-lg min-h-[100px] mb-3 focus:outline-none focus:border-indigo-500"></textarea>
                                    <div className="flex justify-end">
                                        <button type="submit" disabled={!newReflection.trim()} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 shadow-sm transition-all">Add Entry</button>
                                    </div>
                                </form>
                            </div>
                        )}

                        {activeTab === 'stuck-history' && (
                            <div className="space-y-6">
                                {stuckLogs.length > 0 && (
                                    <div className="bg-white p-5 rounded-xl border border-amber-100 shadow-sm">
                                        <h3 className="text-sm font-semibold text-amber-900 mb-4 flex items-center gap-2">
                                            <AlertTriangle className="w-4 h-4 text-amber-500" /> Stuck Response History
                                        </h3>
                                        <div className="space-y-4">
                                            {stuckLogs.map(log => (
                                                <div key={log.id} className="p-4 bg-amber-50 rounded-lg border border-amber-100 relative group overflow-hidden">
                                                    <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                                                        <AlertTriangle className="w-12 h-12 -mr-4 -mt-4 rotate-12" />
                                                    </div>
                                                    <div className="flex justify-between items-center mb-3">
                                                        <span className="text-[10px] font-black text-amber-700 uppercase tracking-widest bg-amber-200/50 px-2 py-0.5 rounded">Action Strategy</span>
                                                        <span className="text-xs text-amber-600 font-medium">{log.created_at ? new Date(log.created_at).toLocaleDateString() : ''} by {log.user_name}</span>
                                                    </div>
                                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                        <div>
                                                            <label className="text-[9px] font-bold text-amber-500 uppercase tracking-wider block mb-1">Obstacle</label>
                                                            <p className="text-amber-900 text-xs font-semibold leading-tight">{log.reason}</p>
                                                        </div>
                                                        <div>
                                                            <label className="text-[9px] font-bold text-amber-500 uppercase tracking-wider block mb-1">Commitment</label>
                                                            <p className="text-amber-900 text-xs font-semibold leading-tight">{log.action_taken}</p>
                                                        </div>
                                                        <div>
                                                            <label className="text-[9px] font-bold text-amber-500 uppercase tracking-wider block mb-1">Resolution</label>
                                                            <div className="flex">
                                                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded leading-none ${
                                                                    log.resolution?.includes('Messaged') ? 'bg-indigo-100 text-indigo-700' : 
                                                                    log.resolution?.includes('Self-Resolved') ? 'bg-emerald-100 text-emerald-700' :
                                                                    'bg-amber-200 text-amber-800'
                                                                }`}>
                                                                    {log.resolution || 'Committed'}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="mt-3 pt-3 border-t border-amber-200/50">
                                                        <label className="text-[9px] font-bold text-amber-500 uppercase tracking-wider block mb-1">Planned Step</label>
                                                        <p className="text-amber-800 text-sm whitespace-pre-wrap italic">"{log.next_action_text}"</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'resources' && (
                            <div className="space-y-6">
                                <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                                    <h3 className="text-sm font-semibold text-gray-900 mb-4 uppercase tracking-wider">Resources</h3>
                                    <div className="space-y-3">
                                        {resources.map(res => (
                                            <div key={res.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border border-gray-100">
                                                <div className="flex items-center gap-3">
                                                    {res.type === 'file' ? <FileText className="w-4 h-4 text-indigo-500" /> : <LinkIcon className="w-4 h-4 text-indigo-500" />}
                                                    <a href={res.url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium hover:text-indigo-600 transition-colors">{res.title}</a>
                                                </div>
                                                <ExternalLink className="w-4 h-4 text-gray-400" />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <form onSubmit={handleAddResource} className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                                    <div className="flex gap-2 mb-4">
                                        <button type="button" onClick={() => setNewResourceType('file')} className={`flex-1 py-2 text-xs font-bold rounded ${newResourceType === 'file' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600'}`}>File</button>
                                        <button type="button" onClick={() => setNewResourceType('link')} className={`flex-1 py-2 text-xs font-bold rounded ${newResourceType === 'link' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600'}`}>Link</button>
                                    </div>
                                    <input type="text" value={newResourceTitle} onChange={(e) => setNewResourceTitle(e.target.value)} placeholder="Title" className="w-full text-sm p-2 border border-gray-200 rounded mb-2 outline-none focus:border-indigo-500" />
                                    {newResourceType === 'link' ? (
                                        <input type="text" value={newResourceUrl} onChange={(e) => setNewResourceUrl(e.target.value)} placeholder="URL" className="w-full text-sm p-2 border border-gray-200 rounded mb-3 outline-none focus:border-indigo-500" />
                                    ) : (
                                        <input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} className="w-full text-sm mb-3" />
                                    )}
                                    <button type="submit" disabled={loading} className="w-full bg-slate-900 text-white py-2 rounded-lg font-bold text-sm hover:bg-slate-800 transition-colors">Attach Resource</button>
                                </form>
                            </div>
                        )}

                                {activeTab === 'messages' && (
                            <div className="h-full flex flex-col bg-gray-50 rounded-xl overflow-hidden border border-gray-100">
                                <div className="flex-1 overflow-y-auto p-5 space-y-4 max-h-[500px]">
                                    {!showAllMessages && messages.length >= 15 && (
                                        <div className="flex justify-center pb-4">
                                            <button 
                                                onClick={handleFetchAllMessages}
                                                className="text-[10px] font-black text-indigo-600 hover:text-indigo-700 uppercase tracking-widest bg-white border border-indigo-100 px-4 py-1.5 rounded-full shadow-sm transition-all hover:shadow-md"
                                            >
                                                See all past messages
                                            </button>
                                        </div>
                                    )}
                                    {messages.length === 0 ? (
                                        <div className="text-center text-gray-400 py-10"><p className="text-sm">No messages yet.</p></div>
                                    ) : (
                                        messages.map((msg, idx) => {
                                            const isCurrentUser = msg.user_id === user?.id;
                                            return (
                                                <div key={msg.id || idx} className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}>
                                                    <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${isCurrentUser ? 'bg-indigo-600 text-white' : 'bg-white text-gray-900 border border-gray-100'}`}>
                                                        {msg.visibility === 'teacher' && <div className="text-[9px] uppercase font-bold text-amber-500 mb-1">Private Message</div>}
                                                        {!isCurrentUser && <div className="text-[10px] font-bold text-gray-400 mb-1">{msg.user_name}</div>}
                                                        <div className="text-sm">{msg.message}</div>
                                                        <div className="text-[9px] mt-1 text-right opacity-50">{msg.created_at ? new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</div>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                    <div ref={messagesEndRef} />
                                </div>
                                <div className="p-4 bg-white border-t border-gray-100">
                                    <div className="flex gap-2 mb-3">
                                        <button type="button" onClick={() => setMessageVisibility('team')} className={`text-[10px] px-3 py-1 rounded-full font-bold uppercase tracking-wider ${messageVisibility === 'team' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-500'}`}>To Team</button>
                                        <button type="button" onClick={() => setMessageVisibility('teacher')} className={`text-[10px] px-3 py-1 rounded-full font-bold uppercase tracking-wider ${messageVisibility === 'teacher' ? 'bg-amber-600 text-white' : 'bg-gray-100 text-gray-500'}`}>To Teacher</button>
                                    </div>
                                    <form onSubmit={handleSendMessage} className="flex gap-2">
                                        <input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="Type a message..." className="flex-1 bg-gray-50 border border-gray-200 rounded-full px-4 py-2 text-sm outline-none focus:border-indigo-500" />
                                        <button type="submit" disabled={!newMessage.trim()} className="bg-indigo-600 text-white p-2 rounded-full hover:bg-indigo-700 transition-colors"><Send className="w-4 h-4" /></button>
                                    </form>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
