import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface ProtectedRouteProps {
    allowedRoles?: ('teacher' | 'student' | 'admin')[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles }) => {
    const { user, loading } = useAuth();
    const location = useLocation();

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center">Loading session...</div>;
    }

    if (!user) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (allowedRoles && !allowedRoles.includes(user.role as any)) {
        // If the user is an admin but the route doesn't allow admins (e.g. student-only), redirect to admin dashboard
        if ((user.role as any) === 'admin') return <Navigate to="/admin/dashboard" replace />;
        // For others, redirect to their home base
        return <Navigate to={user.role === 'teacher' ? '/teacher/dashboard' : '/student/today'} replace />;
    }

    return <Outlet />;
};
