import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api/client';
import { Class, User, Project, Team } from '../types';
import { Users, Plus, ArrowLeft, ChevronDown, ChevronRight, AlertCircle, Pencil, ExternalLink, Key } from 'lucide-react';
import { AssignProjectModal } from '../components/AssignProjectModal';
import { TeamMembersModal } from '../components/TeamMembersModal';
import { useToast } from '../contexts/ToastContext';

interface ProjectWithTeams extends Project {
    teams: Team[];
}

interface ClassData {
    class: Class;
    students: User[];
    projects: ProjectWithTeams[];
}

const ClassDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const [data, setData] = useState<ClassData | null>(null);
    const [expandedProjectIds, setExpandedProjectIds] = useState<Set<number>>(new Set());
    const [loading, setLoading] = useState(true);
    const [atRiskStudents, setAtRiskStudents] = useState<any[]>([]);
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
    const { addToast } = useToast();

    useEffect(() => {
        if (data) {
            document.title = `${data.class.name} - Class Details | PBL Manager`;
        } else {
            document.title = "Class Details | PBL Manager";
        }
    }, [data]);

    const fetchClassData = async () => {
        if (!id) return;
        try {
            const classRes = await api.get<ClassData>(`/classes/${id}`);
            setData(classRes);

            // Fetch At Risk Students for this class
            const riskRes = await api.get<any[]>(`/analytics/at-risk?class_id=${id}`);
            setAtRiskStudents(riskRes || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchClassData();
    }, [id]);

    const toggleProject = async (projectId: number) => {
        setExpandedProjectIds(prev => {
            const next = new Set(prev);
            if (next.has(projectId)) {
                next.delete(projectId);
            } else {
                next.add(projectId);
                // Fetch teams if expanding (optional optimization could check if teams already exist)
                fetchTeams(projectId);
            }
            return next;
        });
    };

    const fetchTeams = async (projectId: number) => {
        try {
            const teams = await api.get<Team[]>(`/projects/${projectId}/teams?class_id=${id}`);
            setData(prev => {
                if (!prev) return null;
                return {
                    ...prev,
                    projects: prev.projects.map(p => p.id === projectId ? { ...p, teams: teams || [] } : p)
                };
            });
        } catch (e) { console.error(e); }
    };

    const handleCreateTeam = async (projectId: number) => {
        const name = prompt("Enter team name:");
        if (!name) return;
        try {
            await api.post(`/projects/${projectId}/teams`, { name, class_id: Number(id) });
            fetchTeams(projectId);
            addToast('Team created successfully', 'success');
        } catch (e) {
            console.error(e);
            addToast("Failed to create team", 'error');
        }
    };

    // Add Student Logic
    const [isAddStudentOpen, setIsAddStudentOpen] = useState(false);
    const [newStudentEmail, setNewStudentEmail] = useState('');
    const [newStudentName, setNewStudentName] = useState('');
    const [addStudentLoading, setAddStudentLoading] = useState(false);
    const [searchResults, setSearchResults] = useState<User[]>([]);
    const [showDropdown, setShowDropdown] = useState(false);

    // Edit Team Logic
    const [editingTeam, setEditingTeam] = useState<Team | null>(null);

    useEffect(() => {
        const timer = setTimeout(async () => {
            if (newStudentEmail.length >= 2 && !newStudentEmail.includes('@')) {
                // Search by name or email fragment
                try {
                    const res = await api.get<User[]>(`/users/search?q=${encodeURIComponent(newStudentEmail)}&role=student`);
                    setSearchResults(res || []);
                    setShowDropdown(true);
                } catch (e) {
                    console.error(e);
                }
            } else {
                setSearchResults([]);
                setShowDropdown(false);
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [newStudentEmail]);

    const selectStudent = (user: User) => {
        setNewStudentEmail(user.email);
        setNewStudentName(user.name);
        setSearchResults([]);
        setShowDropdown(false);
    };

    const handleAddStudentSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setAddStudentLoading(true);
        try {
            await api.post(`/classes/${id}/students`, { email: newStudentEmail, name: newStudentName });
            setNewStudentEmail('');
            setNewStudentName('');
            setIsAddStudentOpen(false);
            fetchClassData(); // Refresh roster
            addToast('Student added successfully', 'success');
        } catch (err: any) {
            console.error(err);
            addToast(err.message || 'Failed to add student. Please check the email.', 'error');
        } finally {
            setAddStudentLoading(false);
        }
    };

    const handleResetPassword = async (studentId: number, studentName: string) => {
        if (!confirm(`Are you sure you want to reset the password for ${studentName} to the default "student123"?`)) {
            return;
        }

        try {
            await api.post(`/students/${studentId}/reset-password`, { newPassword: 'student123' });
            addToast(`Password for ${studentName} has been reset.`, 'success');
        } catch (err: any) {
            console.error(err);
            addToast(err.message || 'Failed to reset password', 'error');
        }
    };

    if (loading) return <div>Loading...</div>;
    if (!data) return <div>Class not found</div>;

    return (
        <div className="h-[calc(100vh-80px)] overflow-hidden flex flex-col">
            <div className="flex justify-between items-center mb-4 px-4 pt-4">
                <div>
                    <div className="flex items-center text-sm text-gray-500 mb-1">
                        <Link to="/teacher/dashboard" className="hover:text-gray-900 flex items-center">
                            <ArrowLeft className="w-4 h-4 mr-1" /> Dashboard
                        </Link>
                        <span className="mx-2">/</span>
                        <span>Class Detail</span>
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900">{data.class.name}</h1>
                </div>
            </div>

            <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 p-4 overflow-hidden min-h-0">
                {/* Pane 1: At Risk (Quick Glance) - Width 3 */}
                <div className="lg:col-span-3 flex flex-col bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="p-4 border-b border-gray-100 bg-red-50 flex items-center justify-between">
                        <h2 className="font-semibold text-red-800 flex items-center">
                            <AlertCircle className="w-4 h-4 mr-2" /> Needs Attention
                        </h2>
                        <span className="bg-red-200 text-red-800 text-xs px-2 py-1 rounded-full">{atRiskStudents.length}</span>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                        {atRiskStudents.length === 0 ? (
                            <p className="text-sm text-gray-500 text-center py-4">No students currently at risk.</p>
                        ) : (
                            atRiskStudents.map((s: any) => (
                                <div key={s.student_id} className="p-3 bg-white border border-gray-200 rounded-lg shadow-sm">
                                    <p className="font-medium text-gray-900">{s.name}</p>
                                    <p className="text-xs text-red-600">{s.overdue_count} overdue tasks</p>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Pane 2: Projects & Groups - Width 6 */}
                <div className="lg:col-span-6 flex flex-col bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                        <h2 className="font-semibold text-gray-800">Active Projects & Groups</h2>
                        <button
                            onClick={() => setIsAssignModalOpen(true)}
                            className="text-indigo-600 hover:text-indigo-800 text-sm font-medium flex items-center"
                        >
                            <Plus className="w-4 h-4 mr-1" /> Assign Project
                        </button>
                    </div>
                    {/* ... Project List ... */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {(!data?.projects || data.projects.length === 0) ? (
                            <div className="text-center py-8 text-gray-500">No projects assigned to this class.</div>
                        ) : (
                            data.projects.map((project: ProjectWithTeams) => (
                                <div key={project.id} className="border border-gray-200 rounded-lg overflow-hidden">
                                    {/* Project Header */}
                                    <div className="bg-white p-4 flex justify-between items-start">
                                        <div className="flex-1">
                                            <div className="flex items-center">
                                                <button onClick={() => toggleProject(project.id)} className="mr-2 text-gray-400 hover:text-gray-600">
                                                    {expandedProjectIds.has(project.id) ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                                                </button>
                                                <h3 className="text-lg font-medium text-gray-900">{project.title}</h3>
                                            </div>
                                            <p className="text-sm text-gray-500 mt-1 ml-7 line-clamp-1">{project.driving_question}</p>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <Link to={`/projects/${project.id}`} className="text-xs px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-md hover:bg-indigo-100 font-medium">
                                                Board
                                            </Link>
                                        </div>
                                    </div>

                                    {/* Groups Section (Accordion) */}
                                    {expandedProjectIds.has(project.id) && (
                                        <div className="bg-gray-50 p-4 border-t border-gray-100">
                                            <div className="flex justify-between items-center mb-3">
                                                <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Groups</h4>
                                                <button onClick={() => handleCreateTeam(project.id)} className="text-xs flex items-center text-indigo-600 hover:text-indigo-800">
                                                    <Plus className="w-3 h-3 mr-1" /> New Group
                                                </button>
                                            </div>

                                            <div className="space-y-2">
                                                {project.teams && project.teams.length > 0 ? (
                                                    (project.teams as Team[]).map((team: Team) => (
                                                        <div key={team.id} className="bg-white p-3 rounded border border-gray-200 flex justify-between items-center shadow-sm">
                                                            <Link
                                                                to={`/projects/${project.id}?team_id=${team.id}`}
                                                                className="font-medium text-sm text-indigo-600 hover:underline flex-1 truncate mr-2"
                                                            >
                                                                {team.name}
                                                            </Link>
                                                            <div className="flex items-center space-x-2">
                                                                <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full whitespace-nowrap hidden sm:inline-block">On Track</span>
                                                                <Link
                                                                    to={`/projects/${project.id}?team_id=${team.id}`}
                                                                    className="text-gray-400 hover:text-indigo-600 p-1"
                                                                    title="Open Board"
                                                                >
                                                                    <ExternalLink className="w-3.5 h-3.5" />
                                                                </Link>
                                                                <button
                                                                    onClick={() => setEditingTeam(team)}
                                                                    className="text-gray-400 hover:text-indigo-600"
                                                                    title="Edit Group Members"
                                                                >
                                                                    <Pencil className="w-3.5 h-3.5" />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <p className="text-xs text-gray-400 italic">No groups created yet.</p>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Pane 3: Roster - Width 3 */}
                <div className="lg:col-span-3 flex flex-col bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                        <h2 className="font-semibold text-gray-800">Student Roster</h2>
                        <button onClick={() => setIsAddStudentOpen(true)} className="text-indigo-600 hover:text-indigo-800 text-sm font-medium">
                            + Add
                        </button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-0">
                        <ul className="divide-y divide-gray-100">
                            {data.students.length === 0 ? (
                                <li className="px-4 py-8 text-center text-sm text-gray-500">No students enrolled yet.</li>
                            ) : (
                                data.students.map(student => (
                                    <li key={student.id} className="px-4 py-3 flex items-center hover:bg-gray-50">
                                        <div className="flex-shrink-0 h-8 w-8 bg-gray-200 rounded-full flex items-center justify-center text-xs font-medium text-gray-600">
                                            {student.name.charAt(0)}
                                        </div>
                                        <div className="ml-3 flex-1">
                                            <p className="text-sm font-medium text-gray-900">{student.name}</p>
                                            <p className="text-xs text-gray-500 truncate">{student.email}</p>
                                        </div>
                                        <div>
                                            <button
                                                onClick={() => handleResetPassword(student.id, student.name)}
                                                className="text-gray-400 hover:text-indigo-600 p-1 bg-white rounded-md border shadow-sm flex items-center text-xs"
                                                title="Reset Password"
                                            >
                                                <Key className="w-3.5 h-3.5 mr-1" /> Reset
                                            </button>
                                        </div>
                                    </li>
                                ))
                            )}
                        </ul>
                    </div>
                </div>
            </div>

            {/* Add Student Modal */}
            {isAddStudentOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <h3 className="font-semibold text-gray-900">Add Student</h3>
                            <button onClick={() => setIsAddStudentOpen(false)} className="text-gray-400 hover:text-gray-600">
                                <Users className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleAddStudentSubmit} className="p-6 space-y-4">
                            <div className="relative">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Email or Name <span className="text-red-500">*</span></label>
                                <input
                                    type="text"
                                    required
                                    className="w-full px-3 py-2 border rounded-md"
                                    value={newStudentEmail}
                                    onChange={e => setNewStudentEmail(e.target.value)}
                                    placeholder="Search by name or enter email"
                                    autoComplete="off"
                                />
                                {showDropdown && searchResults.length > 0 && (
                                    <div className="absolute z-10 w-full bg-white border border-gray-200 mt-1 rounded-md shadow-lg max-h-48 overflow-y-auto">
                                        {searchResults.map(user => (
                                            <div
                                                key={user.id}
                                                className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                                                onClick={() => selectStudent(user)}
                                            >
                                                <div className="font-medium text-gray-900">{user.name}</div>
                                                <div className="text-xs text-gray-500">{user.email}</div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Name (Optional)</label>
                                <input
                                    type="text"
                                    className="w-full px-3 py-2 border rounded-md"
                                    value={newStudentName}
                                    onChange={e => setNewStudentName(e.target.value)}
                                    placeholder="Student Name (if new)"
                                />
                            </div>
                            <div className="flex justify-end pt-2">
                                <button type="button" onClick={() => setIsAddStudentOpen(false)} className="px-4 py-2 text-gray-600 mr-2">Cancel</button>
                                <button type="submit" disabled={addStudentLoading} className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50">
                                    {addStudentLoading ? 'Adding...' : 'Add Student'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {data && (
                <AssignProjectModal
                    classId={data.class.id}
                    currentProjects={data.projects}
                    isOpen={isAssignModalOpen}
                    onClose={() => setIsAssignModalOpen(false)}
                    onProjectAssigned={fetchClassData}
                />
            )}

            {editingTeam && data && (
                <TeamMembersModal
                    team={editingTeam}
                    classStudents={data.students}
                    isOpen={!!editingTeam}
                    onClose={() => setEditingTeam(null)}
                    onTeamUpdated={(updatedTeam) => {
                        // Refresh teams for the specific project in the data state
                        setData(prev => {
                            if (!prev) return null;
                            return {
                                ...prev,
                                projects: prev.projects.map(p => {
                                    if (p.id === updatedTeam.project_id) {
                                        const updatedTeams = p.teams?.map(t => t.id === updatedTeam.id ? updatedTeam : t) || [];
                                        return { ...p, teams: updatedTeams };
                                    }
                                    return p;
                                })
                            };
                        });
                        setEditingTeam(updatedTeam);
                    }}
                />
            )}
        </div>
    );
};

export default ClassDetail;
