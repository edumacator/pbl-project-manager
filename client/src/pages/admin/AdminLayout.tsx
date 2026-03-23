import React from 'react';
import { NavLink, Outlet, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
    Users,
    LayoutDashboard,
    LogOut,
    FolderKanban,
    School,
    BarChart3,
    ArrowLeftRight
} from 'lucide-react';

const AdminLayout: React.FC = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const navItems = [
        { to: '/admin/dashboard', icon: LayoutDashboard, label: 'Overview' },
        { to: '/admin/users', icon: Users, label: 'Users' },
        { to: '/admin/classes', icon: School, label: 'Classes' },
        { to: '/admin/stats', icon: BarChart3, label: 'Statistics' },
    ];

    return (
        <div className="h-screen bg-gray-50 flex overflow-hidden">
            {/* Sidebar */}
            <aside className="w-64 bg-indigo-900 text-white flex flex-col shadow-xl sticky top-0 h-screen flex-shrink-0">
                <div className="p-6 flex items-center gap-3">
                    <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                        <FolderKanban className="w-6 h-6 text-white" />
                    </div>
                    <span className="text-xl font-bold tracking-tight">Admin CMS</span>
                </div>

                <nav className="flex-1 px-4 py-6 space-y-2">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            className={({ isActive }) =>
                                `flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${isActive
                                    ? 'bg-white/20 text-white shadow-inner font-bold'
                                    : 'text-indigo-100 hover:bg-white/10 hover:text-white'
                                }`
                            }
                        >
                            <item.icon className="w-5 h-5" />
                            {item.label}
                        </NavLink>
                    ))}
                </nav>

                <div className="px-4 mb-4">
                    <Link
                        to="/teacher/dashboard"
                        className="flex items-center gap-3 px-4 py-3 text-indigo-100 hover:bg-white/10 hover:text-white rounded-xl transition-all border border-indigo-700/50"
                    >
                        <ArrowLeftRight className="w-5 h-5" />
                        Teacher View
                    </Link>
                </div>

                <div className="p-4 border-t border-indigo-800">
                    <div className="flex items-center gap-3 px-4 py-3 mb-4">
                        <div className="w-10 h-10 bg-indigo-700 rounded-full flex items-center justify-center font-bold text-white border-2 border-indigo-600">
                            {user?.first_name?.[0] || 'A'}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold truncate">{user?.name}</p>
                            <p className="text-xs text-indigo-300 truncate">System Admin</p>
                        </div>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-3 text-indigo-100 hover:bg-white/10 hover:text-white rounded-xl transition-all"
                    >
                        <LogOut className="w-5 h-5" />
                        Logout
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-auto">
                <div className="p-8">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};

export default AdminLayout;
