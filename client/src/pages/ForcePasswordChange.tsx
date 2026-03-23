import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { api } from '../api/client';
import { Lock, LogOut, Loader2, CheckCircle2, ShieldCheck } from 'lucide-react';

const ForcePasswordChange: React.FC = () => {
    const { user, logout, login } = useAuth();
    const { addToast } = useToast();
    const navigate = useNavigate();
    
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);

    if (!user) {
        return null;
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (newPassword.length < 6) {
            addToast('Password must be at least 6 characters long', 'error');
            return;
        }

        if (newPassword !== confirmPassword) {
            addToast('Passwords do not match', 'error');
            return;
        }

        setLoading(true);
        try {
            await api.post('/auth/change-password', { newPassword });
            
            addToast('Password updated successfully!', 'success');
            
            // Update the user state locally to clear the flag
            const updatedUser = { ...user, requires_password_change: false };
            const token = localStorage.getItem('auth_token') || '';
            login(token, updatedUser);

            // Redirect to their appropriate dashboard
            const destination = user.role === 'admin' ? '/admin/dashboard' : 
                               user.role === 'teacher' ? '/teacher/dashboard' : 
                               '/student/today';
            navigate(destination);
        } catch (err: any) {
            addToast(err.message || 'Failed to update password', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <div className="max-w-md w-full">
                <div className="bg-white rounded-3xl shadow-xl shadow-slate-200 border border-slate-100 overflow-hidden">
                    <div className="bg-indigo-600 p-8 text-white relative overflow-hidden">
                        <div className="relative z-10">
                            <div className="bg-white/20 w-12 h-12 rounded-xl flex items-center justify-center mb-4 backdrop-blur-sm">
                                <ShieldCheck className="w-6 h-6 text-white" />
                            </div>
                            <h1 className="text-2xl font-bold mb-2">Secure Your Account</h1>
                            <p className="text-indigo-100/80 text-sm leading-relaxed">
                                This is your first time logging in (or your password was reset). For your security, please set a new password.
                            </p>
                        </div>
                        {/* Decorative blobs */}
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl" />
                        <div className="absolute bottom-0 left-0 w-24 h-24 bg-indigo-500/30 rounded-full translate-y-1/2 -translate-x-1/2 blur-xl" />
                    </div>

                    <form onSubmit={handleSubmit} className="p-8 space-y-6">
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-slate-700 ml-1">New Password</label>
                                <div className="relative group">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                                    <input
                                        type="password"
                                        required
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        placeholder="••••••••"
                                        className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-medium"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-slate-700 ml-1">Confirm New Password</label>
                                <div className="relative group">
                                    <CheckCircle2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
                                    <input
                                        type="password"
                                        required
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        placeholder="••••••••"
                                        className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-medium"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-3 pt-2">
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold shadow-lg shadow-indigo-100 transition-all flex items-center justify-center gap-2 group active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    <>
                                        Update Password
                                        <CheckCircle2 className="w-5 h-5 opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" />
                                    </>
                                )}
                            </button>
                            
                            <button
                                type="button"
                                onClick={logout}
                                className="w-full py-3 text-slate-500 hover:text-slate-700 font-semibold text-sm transition-colors flex items-center justify-center gap-2"
                            >
                                <LogOut className="w-4 h-4" />
                                Sign out and try later
                            </button>
                        </div>
                    </form>

                    <div className="px-8 pb-8">
                        <div className="p-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                            <p className="text-xs text-slate-500 text-center uppercase tracking-wider font-bold mb-2">Password Requirements</p>
                            <ul className="text-xs text-slate-400 space-y-1.5 list-disc pl-4 font-medium">
                                <li>At least 6 characters long</li>
                                <li>Unique to your account</li>
                                <li>Do not share with classmates</li>
                            </ul>
                        </div>
                    </div>
                </div>
                <p className="text-center mt-8 text-slate-400 text-sm font-medium">
                    PBL Project Manager &bull; Student-Centered Learning
                </p>
            </div>
        </div>
    );
};

export default ForcePasswordChange;
