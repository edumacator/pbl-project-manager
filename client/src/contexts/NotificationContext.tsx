import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';
import { useAuth } from './AuthContext';

export interface Notification {
    id: number;
    task_id: number;
    user_id: number;
    user_name: string;
    message: string;
    task_title: string;
    project_id: number;
    project_title: string;
    created_at: string;
    visibility: 'team' | 'teacher';
    is_system?: boolean;
}

interface NotificationContextType {
    notifications: Notification[];
    pings: Notification[];
    discussions: Notification[];
    unreadCount: number;
    fetchNotifications: () => Promise<void>;
    dismissNotification: (id: number) => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState<Notification[]>([]);

    const fetchNotifications = useCallback(async () => {
        if (!user) return;
        try {
            const res = await api.get<Notification[]>('/notifications/unread-stuck');
            if (Array.isArray(res)) {
                setNotifications(res);
            }
        } catch (err) {
            console.error("Failed to fetch notifications:", err);
        }
    }, [user]);

    const dismissNotification = async (id: number) => {
        try {
            await api.post(`/notifications/${id}/dismiss`, {});
            setNotifications(prev => prev.filter(n => n.id !== id));
        } catch (err) {
            console.error("Failed to dismiss notification:", err);
        }
    };

    useEffect(() => {
        if (user) {
            fetchNotifications();
            const interval = setInterval(fetchNotifications, 30000); // 30s
            return () => clearInterval(interval);
        } else {
            setNotifications([]);
        }
    }, [user, fetchNotifications]);

    const pings = notifications.filter(n => n.is_system);
    const discussions = notifications.filter(n => !n.is_system);

    return (
        <NotificationContext.Provider value={{ 
            notifications, 
            pings, 
            discussions, 
            unreadCount: notifications.length,
            fetchNotifications,
            dismissNotification
        }}>
            {children}
        </NotificationContext.Provider>
    );
};

export const useNotifications = () => {
    const context = useContext(NotificationContext);
    if (context === undefined) {
        throw new Error('useNotifications must be used within a NotificationProvider');
    }
    return context;
};
