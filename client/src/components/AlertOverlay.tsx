import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, X, MessageSquare } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications, Notification } from '../contexts/NotificationContext';

const AlertOverlay: React.FC = () => {
    const { user } = useAuth();
    const { pings, dismissNotification } = useNotifications();
    const navigate = useNavigate();

    const handleHelpAction = async (notification: Notification) => {
        // Dismiss first to clear the alert channel
        await dismissNotification(notification.id);
        
        // Navigate to the correct project board based on role
        const destination = user?.role === 'student' 
            ? `/student/projects/${notification.project_id}?task=${notification.task_id}`
            : `/projects/${notification.project_id}?view=board&task=${notification.task_id}`;
        
        navigate(destination);
    };

    if (pings.length === 0) return null;

    return (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[99999] w-full max-w-lg px-4 pointer-events-none">
            <div className="space-y-3 pointer-events-auto">
                {pings.map((notification) => (
                    <div 
                        key={notification.id}
                        className="bg-white border-2 border-amber-500 rounded-xl shadow-2xl overflow-hidden animate-in slide-in-from-top-8 duration-500"
                    >
                        <div className="bg-amber-500 px-4 py-2 flex items-center justify-between">
                            <div className="flex items-center gap-2 text-white">
                                <AlertTriangle className="w-5 h-5 fill-amber-200 text-amber-500" />
                                <span className="text-xs font-black uppercase tracking-widest">Stuck Alert</span>
                            </div>
                            <button 
                                onClick={() => dismissNotification(notification.id)}
                                className="p-1 hover:bg-amber-600 rounded-lg text-white transition-colors"
                                title="Dismiss"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="p-4">
                            <div className="flex items-start gap-4">
                                <div className="bg-amber-50 p-2.5 rounded-full">
                                    <MessageSquare className="w-6 h-6 text-amber-600" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[11px] font-bold text-amber-600 uppercase mb-1">
                                        From {notification.user_name} • Urgent Help Request
                                    </p>
                                    <h4 className="text-sm font-bold text-gray-900 leading-tight mb-2">
                                        Stuck on <span className="text-amber-700">"{notification.task_title}"</span>
                                    </h4>
                                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-100 italic text-gray-700 text-xs leading-relaxed mb-2">
                                        "{notification.message}"
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] text-gray-400 font-medium">
                                            Project: {notification.project_title}
                                        </span>
                                        <button 
                                            onClick={() => handleHelpAction(notification)}
                                            className="text-[10px] font-black text-amber-600 hover:text-amber-700 uppercase tracking-wider underline underline-offset-2"
                                        >
                                            Got it, I'll help!
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default AlertOverlay;
