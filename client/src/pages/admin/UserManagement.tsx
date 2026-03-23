import React, { useEffect, useState } from 'react';
import { api } from '../../api/client';
import {
    Search,
    Edit2,
    Trash2,
    X,
    Upload,
    CheckCircle2,
    AlertCircle,
    Loader2
} from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';

interface User {
    id: number;
    name: string;
    first_name: string;
    last_name: string;
    email: string;
    role: 'teacher' | 'student' | 'admin';
    student_id?: string;
}

const UserManagement: React.FC = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [showBulkModal, setShowBulkModal] = useState(false);
    const { addToast } = useToast();

    useEffect(() => {
        loadUsers();
    }, []);

    const loadUsers = () => {
        setLoading(true);
        api.get<User[]>('/admin/users')
            .then(data => setUsers(data))
            .catch(_ => addToast('Failed to load users', 'error'))
            .finally(() => setLoading(false));
    };

    const handleDelete = async (id: number) => {
        if (!window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) return;
        try {
            await api.delete(`/admin/users/${id}`);
            addToast('User deleted successfully', 'success');
            loadUsers();
        } catch (err: any) {
            addToast(err.message || 'Failed to delete user', 'error');
        }
    };

    const handleUpdateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingUser) return;
        try {
            await api.patch(`/admin/users/${editingUser.id}`, {
                firstName: editingUser.first_name,
                lastName: editingUser.last_name,
                email: editingUser.email,
                role: editingUser.role
            });
            addToast('User updated successfully', 'success');
            setEditingUser(null);
            loadUsers();
        } catch (err: any) {
            addToast(err.message || 'Failed to update user', 'error');
        }
    };

    const filteredUsers = users.filter(u =>
        u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) return <div>Loading users...</div>;

    return (
        <div>
            <header className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
                    <p className="text-gray-500">Manage all system accounts.</p>
                </div>
                <button
                    onClick={() => setShowBulkModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all shadow-sm shadow-indigo-200"
                >
                    <Upload className="w-4 h-4" />
                    Bulk Upload
                </button>
            </header>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-gray-100 flex gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search users by name or email..."
                            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-100">
                            <tr>
                                <th className="text-left px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Name</th>
                                <th className="text-left px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Email</th>
                                <th className="text-left px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Role</th>
                                <th className="text-right px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredUsers.map(user => (
                                <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="font-medium text-gray-900">{user.name}</div>
                                        <div className="text-xs text-gray-400">ID: {user.id}</div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-600">{user.email}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${user.role === 'admin' ? 'bg-indigo-100 text-indigo-700' :
                                            user.role === 'teacher' ? 'bg-purple-100 text-purple-700' :
                                                'bg-green-100 text-green-700'
                                            }`}>
                                            {user.role}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end gap-2">
                                            <button
                                                onClick={() => setEditingUser(user)}
                                                className="p-2 text-gray-400 hover:text-indigo-600 transition-colors"
                                                title="Edit User"
                                            >
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(user.id)}
                                                className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                                                title="Delete User"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Edit User Modal */}
            {editingUser && (
                <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <h3 className="font-bold text-gray-900">Edit User</h3>
                            <button onClick={() => setEditingUser(null)} className="text-gray-400 hover:text-gray-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleUpdateUser} className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">First Name</label>
                                    <input
                                        type="text"
                                        className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                                        value={editingUser.first_name}
                                        onChange={e => setEditingUser({ ...editingUser, first_name: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Last Name</label>
                                    <input
                                        type="text"
                                        className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                                        value={editingUser.last_name}
                                        onChange={e => setEditingUser({ ...editingUser, last_name: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Email</label>
                                <input
                                    type="email"
                                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                                    value={editingUser.email}
                                    onChange={e => setEditingUser({ ...editingUser, email: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Role</label>
                                <select
                                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                                    value={editingUser.role}
                                    onChange={e => setEditingUser({ ...editingUser, role: e.target.value as any })}
                                >
                                    <option value="student">Student</option>
                                    <option value="teacher">Teacher</option>
                                    <option value="admin">Admin</option>
                                </select>
                            </div>
                            <div className="pt-4 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setEditingUser(null)}
                                    className="flex-1 px-4 py-2 border border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-colors shadow-sm"
                                >
                                    Save Changes
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {showBulkModal && (
                <BulkUploadModal
                    onClose={() => setShowBulkModal(false)}
                    onSuccess={() => {
                        loadUsers();
                        setShowBulkModal(false);
                    }}
                />
            )}
        </div>
    );
};

interface BulkUploadModalProps {
    onClose: () => void;
    onSuccess: () => void;
}

const BulkUploadModal: React.FC<BulkUploadModalProps> = ({ onClose, onSuccess }) => {
    const [role, setRole] = useState<'student' | 'teacher'>('student');
    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [results, setResults] = useState<{ created: number; failed: any[] } | null>(null);
    const { addToast } = useToast();

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setResults(null);
            setProgress(0);
        }
    };

    const runUpload = async () => {
        if (!file) return;
        setUploading(true);
        setProgress(0);
        // Don't set results here yet, otherwise the results screen shows 0s during processing

        try {
            const text = await file.text();
            const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');

            // Assume first line is header: first_name, last_name, email, password
            const dataLines = lines.slice(1);
            const total = dataLines.length;

            if (total === 0) {
                addToast('CSV file is empty or missing data rows.', 'error');
                setUploading(false);
                return;
            }

            const batchSize = 50;
            const batches = [];
            for (let i = 0; i < dataLines.length; i += batchSize) {
                const chunk = dataLines.slice(i, i + batchSize);
                const parsedChunk = chunk.map(line => {
                    const parts = line.split(',').map(p => p.trim());
                    return {
                        first_name: parts[0],
                        last_name: parts[1],
                        email: parts[2],
                        password: parts[3],
                        student_id: parts[4] || null
                    };
                });
                batches.push(parsedChunk);
            }

            let totalCreated = 0;
            let allFailed: any[] = [];

            for (let i = 0; i < batches.length; i++) {
                const response = await api.post<any>('/admin/users/bulk', {
                    users: batches[i],
                    role: role
                });

                totalCreated += response.created;
                allFailed = [...allFailed, ...response.failed];

                setProgress(Math.round(((i + 1) / batches.length) * 100));
            }

            setResults({ created: totalCreated, failed: allFailed });
            addToast(`Successfully processed all batches. ${totalCreated} users created.`, 'success');
        } catch (err: any) {
            addToast(err.message || 'Failed to process CSV', 'error');
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 flex-shrink-0">
                    <div>
                        <h3 className="font-bold text-gray-900">Bulk User Upload</h3>
                        <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Admin Tool</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto custom-scrollbar space-y-6">
                    {!results ? (
                        <>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">1. Select User Role</label>
                                    <div className="grid grid-cols-2 gap-3">
                                        <button
                                            onClick={() => setRole('student')}
                                            className={`px-4 py-3 rounded-xl border-2 transition-all text-sm font-bold flex items-center justify-center gap-2 ${role === 'student'
                                                    ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-sm'
                                                    : 'border-gray-100 bg-gray-50 text-gray-400 hover:border-gray-200'
                                                }`}
                                        >
                                            Student
                                        </button>
                                        <button
                                            onClick={() => setRole('teacher')}
                                            className={`px-4 py-3 rounded-xl border-2 transition-all text-sm font-bold flex items-center justify-center gap-2 ${role === 'teacher'
                                                    ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-sm'
                                                    : 'border-gray-100 bg-gray-50 text-gray-400 hover:border-gray-200'
                                                }`}
                                        >
                                            Teacher
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">2. Upload CSV File</label>
                                    <div className="relative group">
                                        <input
                                            type="file"
                                            accept=".csv"
                                            onChange={handleFileChange}
                                            className="absolute inset-0 opacity-0 cursor-pointer z-10"
                                            disabled={uploading}
                                        />
                                        <div className={`p-8 border-2 border-dashed rounded-2xl text-center transition-all ${file
                                                ? 'border-green-300 bg-green-50'
                                                : 'border-gray-200 bg-gray-50 group-hover:border-indigo-300 group-hover:bg-indigo-50/30'
                                            }`}>
                                            <Upload className={`w-10 h-10 mx-auto mb-3 transition-colors ${file ? 'text-green-500' : 'text-gray-300 group-hover:text-indigo-500'}`} />
                                            <p className="text-sm font-medium text-gray-600">
                                                {file ? file.name : 'Click or drag CSV file here'}
                                            </p>
                                            <p className="text-[10px] text-gray-400 mt-1 uppercase font-bold tracking-widest">
                                                Expected: first_name, last_name, email, password, student_id
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {uploading && (
                                <div className="space-y-3">
                                    <div className="flex justify-between items-end">
                                        <span className="text-xs font-bold text-gray-500 uppercase">Processing Batches...</span>
                                        <span className="text-sm font-black text-indigo-600">{progress}%</span>
                                    </div>
                                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden border border-gray-100">
                                        <div
                                            className="h-full bg-indigo-600 transition-all duration-300 ease-out shadow-[0_0_10px_rgba(79,70,229,0.3)]"
                                            style={{ width: `${progress}%` }}
                                        />
                                    </div>
                                    <p className="text-[10px] text-gray-400 text-center animate-pulse">
                                        Batch processing prevents server timeouts. Please stay on this page.
                                    </p>
                                </div>
                            )}

                            <div className="pt-4 flex gap-3">
                                <button
                                    onClick={onClose}
                                    className="flex-1 px-4 py-3 border border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors"
                                    disabled={uploading}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={runUpload}
                                    className={`flex-1 px-4 py-3 bg-indigo-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-200 transition-all flex items-center justify-center gap-2 ${(!file || uploading) ? 'opacity-50 cursor-not-allowed' : 'hover:bg-indigo-700 active:scale-[0.98]'
                                        }`}
                                    disabled={!file || uploading}
                                >
                                    {uploading ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Uploading...
                                        </>
                                    ) : (
                                        'Start Upload'
                                    )}
                                </button>
                            </div>
                        </>
                    ) : (
                        <div className="space-y-6">
                            <div className="text-center p-6 bg-gray-50 rounded-2xl border border-gray-100">
                                <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3" />
                                <h4 className="font-black text-gray-900 text-xl">Upload Complete</h4>
                                <p className="text-sm text-gray-500 mt-2">
                                    Processed {role}s: <span className="text-indigo-600 font-bold">{results.created + results.failed.length}</span>
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-4 text-center">
                                <div className="p-4 bg-green-50 border border-green-100 rounded-2xl">
                                    <p className="text-[10px] font-black text-green-600 uppercase tracking-widest mb-1">Created</p>
                                    <p className="text-3xl font-black text-green-700">{results.created}</p>
                                </div>
                                <div className={`p-4 rounded-2xl border ${results.failed.length > 0 ? 'bg-red-50 border-red-100' : 'bg-gray-50 border-gray-100'}`}>
                                    <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${results.failed.length > 0 ? 'text-red-600' : 'text-gray-400'}`}>Failed</p>
                                    <p className={`text-3xl font-black ${results.failed.length > 0 ? 'text-red-700' : 'text-gray-400'}`}>{results.failed.length}</p>
                                </div>
                            </div>

                            {results.failed.length > 0 && (
                                <div className="space-y-3">
                                    <h5 className="text-xs font-black text-red-600 uppercase tracking-widest flex items-center gap-2">
                                        <AlertCircle className="w-3 h-3" />
                                        Failure Details
                                    </h5>
                                    <div className="bg-red-50/50 rounded-xl overflow-hidden border border-red-50 p-2 space-y-1">
                                        {results.failed.slice(0, 5).map((f, i) => (
                                            <div key={i} className="text-[11px] p-2 hover:bg-white rounded-lg transition-colors border border-transparent hover:border-red-100">
                                                <span className="font-bold text-red-700">Row {f.row}:</span>
                                                <span className="text-gray-600 ml-2">{f.email}</span>
                                                <span className="mx-2 text-gray-300">|</span>
                                                <span className="text-gray-500 italic">{f.reason}</span>
                                            </div>
                                        ))}
                                        {results.failed.length > 5 && (
                                            <p className="text-[10px] text-gray-400 text-center py-2 font-medium">
                                                + {results.failed.length - 5} more errors
                                            </p>
                                        )}
                                    </div>
                                </div>
                            )}

                            <button
                                onClick={onSuccess}
                                className="w-full px-4 py-3 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 active:scale-[0.98]"
                            >
                                Done
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default UserManagement;
