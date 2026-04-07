import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageCircle, X, ChevronRight, MessageSquare, ChevronLeft } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications, Notification } from '../contexts/NotificationContext';

const DiscussionDrawer: React.FC = () => {
    const { user } = useAuth();
    const { discussions, dismissNotification } = useNotifications();
    const [isOpen, setIsOpen] = useState(false);
    const navigate = useNavigate();

    const handleMessageClick = async (notification: Notification) => {
        // Dismiss the notification
        await dismissNotification(notification.id);
        
        // Navigate and open the discussion tab
        const destination = user?.role === 'student' 
            ? `/student/projects/${notification.project_id}?task=${notification.task_id}&tab=messages`
            : `/projects/${notification.project_id}?view=board&task=${notification.task_id}&tab=messages`;
        
        navigate(destination);
        setIsOpen(false);
    };

    const hasUnread = discussions.length > 0;

    return (
        <>
            {/* Subtle Tab Trigger */}
            <div 
                className={`fixed right-0 top-1/2 -translate-y-1/2 z-[45000] transition-all duration-500 transform ${isOpen ? 'translate-x-full' : 'translate-x-0'}`}
            >
                <button
                    onClick={() => setIsOpen(true)}
                    className={`group flex items-center gap-2 py-4 pl-3 pr-1.5 rounded-l-2xl shadow-lg border-2 border-r-0 transition-all ${
                        hasUnread 
                        ? 'bg-indigo-600 border-indigo-400 text-white animate-pulse' 
                        : 'bg-white border-gray-100 text-gray-400 hover:text-indigo-600'
                    }`}
                >
                    <div className="flex flex-col items-center gap-1">
                        <MessageCircle className={`w-5 h-5 ${hasUnread ? 'animate-bounce' : ''}`} />
                        {hasUnread && (
                            <span className="bg-white text-indigo-600 text-[10px] font-black px-1.5 py-0.5 rounded-full shadow-sm">
                                {discussions.length}
                            </span>
                        )}
                    </div>
                    <ChevronLeft className="w-4 h-4 opacity-50 group-hover:opacity-100 transition-opacity" />
                </button>
            </div>

            {/* Slide-out Drawer Overlay */}
            {isOpen && (
                <div 
                    className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[49000] animate-in fade-in duration-300"
                    onClick={() => setIsOpen(false)}
                />
            )}

            {/* Side Drawer Content */}
            <div className={`fixed right-0 top-0 bottom-0 w-80 bg-white z-[50000] shadow-2xl transition-transform duration-500 ease-in-out transform ${isOpen ? 'translate-x-0' : 'translate-x-full'} flex flex-col`}>
                <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900 leading-tight">Discussions</h2>
                        <p className="text-xs text-gray-500 font-medium">Recent team messages</p>
                    </div>
                    <button 
                        onClick={() => setIsOpen(false)}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-white rounded-xl shadow-sm transition-all border border-transparent hover:border-gray-100"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {discussions.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-48 text-center px-6">
                            <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center mb-3">
                                <MessageSquare className="w-6 h-6 text-gray-300" />
                            </div>
                            <p className="text-sm font-bold text-gray-400">All caught up!</p>
                            <p className="text-[11px] text-gray-400 leading-relaxed mt-1">No new discussion messages for your projects.</p>
                        </div>
                    ) : (
                        discussions.map((msg) => (
                            <button
                                key={msg.id}
                                onClick={() => handleMessageClick(msg)}
                                className="w-full text-left bg-white border border-gray-100 p-4 rounded-2xl hover:border-indigo-200 hover:shadow-md transition-all group relative overflow-hidden"
                            >
                                <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500 transform -translate-x-full group-hover:translate-x-0 transition-transform" />
                                
                                <div className="flex justify-between items-start mb-2">
                                    <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest bg-indigo-50 px-2 py-0.5 rounded">
                                        {msg.project_title}
                                    </span>
                                    <span className="text-[9px] text-gray-400 font-medium">
                                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                                <h4 className="text-xs font-bold text-gray-900 mb-1 group-hover:text-indigo-600 transition-colors truncate">
                                    {msg.task_title}
                                </h4>
                                <p className="text-[11px] text-gray-500 font-bold mb-2">
                                    {msg.user_name} said:
                                </p>
                                <div className="text-[11px] text-gray-600 italic leading-relaxed line-clamp-2 bg-gray-50 p-2 rounded-lg border border-gray-100/50">
                                    "{msg.message}"
                                </div>
                                <div className="mt-3 flex items-center justify-end text-[10px] font-black text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity uppercase tracking-tighter">
                                    View Discussion <ChevronRight className="w-3 h-3 ml-0.5" />
                                </div>
                            </button>
                        ))
                    )}
                </div>
                
                {hasUnread && (
                    <div className="p-4 bg-indigo-50 border-t border-indigo-100">
                        <p className="text-[10px] text-indigo-600 font-bold text-center uppercase tracking-widest">
                            {discussions.length} New Response{discussions.length > 1 ? 's' : ''}
                        </p>
                    </div>
                )}
            </div>
        </>
    );
};

export default DiscussionDrawer;
