import React, { useEffect, useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { LayoutDashboard, FolderKanban, CheckSquare, LogOut, Plus } from 'lucide-react';
import { api } from '../api/client';
import { Project } from '../types';
import { useAuth } from '../contexts/AuthContext';

const Layout: React.FC = () => {
    const location = useLocation();
    const { user, logout } = useAuth();
    const [projects, setProjects] = useState<Project[]>([]);

    const fetchProjects = () => {
        api.get<Project[]>('/projects')
            .then(data => {
                if (Array.isArray(data)) {
                    setProjects(data);
                }
            })
            .catch(err => console.error(err));
    };

    useEffect(() => {
        fetchProjects();

        const handleProjectChange = () => fetchProjects();
        window.addEventListener('projects-changed', handleProjectChange);

        return () => {
            window.removeEventListener('projects-changed', handleProjectChange);
        };
    }, []);

    return (
        <div className="flex h-screen bg-gray-50">
            {/* Sidebar */}
            <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
                <div className="p-6">
                    <h1 className="text-xl font-bold text-indigo-600 flex items-center gap-2 mb-4">
                        <FolderKanban className="w-6 h-6" />
                        PBL Manager
                    </h1>

                    {/* Current User Profile Info */}
                    {user && (
                        <div className="bg-gray-50 p-3 rounded-lg flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold">
                                {user.first_name[0]}{user.last_name[0]}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">{user.first_name} {user.last_name}</p>
                                <p className="text-xs text-gray-500 capitalize">{user.role}</p>
                            </div>
                        </div>
                    )}
                </div>
                <nav className="flex-1 mt-4 px-4 space-y-2">
                    <p className="px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Menu</p>

                    {user?.role === 'teacher' && (
                        <Link to="/teacher/dashboard" className={`flex items-center px-4 py-2 rounded-lg transition-colors ${location.pathname === '/teacher/dashboard' ? 'bg-indigo-50 text-indigo-600' : 'text-gray-700 hover:bg-gray-50'}`}>
                            <LayoutDashboard className="w-5 h-5 mr-3" />
                            Dashboard
                        </Link>
                    )}

                    {user?.role === 'student' && (
                        <Link to="/student/today" className={`flex items-center px-4 py-2 rounded-lg transition-colors ${location.pathname === '/student/today' ? 'bg-indigo-50 text-indigo-600' : 'text-gray-700 hover:bg-gray-50'}`}>
                            <CheckSquare className="w-5 h-5 mr-3" />
                            Student Today
                        </Link>
                    )}

                    <div className="pt-4 mt-4 border-t border-gray-100">
                        <div className="flex items-center justify-between px-4 mb-2">
                            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Projects</span>
                            <Link to="/projects/new" className="text-gray-400 hover:text-indigo-600"><Plus className="w-4 h-4" /></Link>
                        </div>
                        <div className="space-y-1">
                            {projects.map(p => {
                                const destination = user?.role === 'teacher' ? `/projects/${p.id}` : `/student/projects/${p.id}`;
                                return (
                                    <Link key={p.id} to={destination} className={`flex items-center px-4 py-2 text-sm rounded-lg transition-colors ${location.pathname === destination ? 'bg-indigo-50 text-indigo-600' : 'text-gray-600 hover:bg-gray-50'}`}>
                                        <FolderKanban className="w-4 h-4 mr-3 opacity-70" />
                                        <span className="truncate">{p.title}</span>
                                    </Link>
                                );
                            })}
                            {projects.length === 0 && (
                                <div className="px-4 py-2 text-xs text-gray-400 italic">No projects yet</div>
                            )}
                        </div>
                    </div>
                </nav>
                <div className="p-4 border-t border-gray-200">
                    <button
                        onClick={logout}
                        className="flex items-center w-full px-4 py-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                        <LogOut className="w-5 h-5 mr-3" />
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

export default Layout;
