import React, { useState } from 'react';
import { User, Team } from '../types';
import { api } from '../api/client';
import { X, UserPlus, Trash2, ShieldAlert } from 'lucide-react';

interface TeamMembersModalProps {
    isOpen: boolean;
    onClose: () => void;
    team: Team;
    classStudents: User[];
    onTeamUpdated: (updatedTeam: Team) => void;
}

export const TeamMembersModal: React.FC<TeamMembersModalProps> = ({ isOpen, onClose, team, classStudents, onTeamUpdated }) => {
    const [loading, setLoading] = useState(false);
    const [selectedStudentId, setSelectedStudentId] = useState<string>('');
    const [error, setError] = useState<string | null>(null);

    // Filter students who are NOT already in the team
    const currentMemberIds = new Set(team.members?.map(m => m.id) || []);
    const availableStudents = classStudents.filter(s => !currentMemberIds.has(s.id));

    const handleAddMember = async () => {
        if (!selectedStudentId) return;
        setLoading(true);
        setError(null);
        try {
            await api.post(`/teams/${team.id}/members`, { user_id: parseInt(selectedStudentId) });

            // Optimistic update or refetch? Refetching is safer or we can construct the new team object
            // Let's assume success and update locally for speed, then maybe trigger a parent refresh if needed
            // Actually, we need the full user object to update local state efficiently.
            // We have it in availableStudents!
            const addedStudent = availableStudents.find(s => s.id === parseInt(selectedStudentId));
            if (addedStudent) {
                const updatedTeam = {
                    ...team,
                    members: [...(team.members || []), addedStudent]
                };
                onTeamUpdated(updatedTeam);
            }
            setSelectedStudentId('');
        } catch (err: any) {
            setError(err.message || 'Failed to add member');
        } finally {
            setLoading(false);
        }
    };

    const handleRemoveMember = async (userId: number) => {
        if (!confirm('Are you sure you want to remove this member?')) return;
        setLoading(true);
        setError(null);
        try {
            await api.delete(`/teams/${team.id}/members/${userId}`);

            const updatedTeam = {
                ...team,
                members: (team.members || []).filter(m => m.id !== userId)
            };
            onTeamUpdated(updatedTeam);
        } catch (err: any) {
            setError(err.message || 'Failed to remove member');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900">Manage Team Members</h2>
                        <p className="text-sm text-gray-500">{team.name}</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6">
                    {error && (
                        <div className="mb-4 bg-red-50 text-red-600 p-3 rounded-lg text-sm flex items-center gap-2">
                            <ShieldAlert className="w-4 h-4" />
                            {error}
                        </div>
                    )}

                    <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Add New Member</label>
                        <div className="flex gap-2">
                            <select
                                value={selectedStudentId}
                                onChange={(e) => setSelectedStudentId(e.target.value)}
                                className="flex-1 rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 py-2 pl-3 text-sm"
                                disabled={loading}
                            >
                                <option value="">Select a student...</option>
                                {availableStudents.map(student => (
                                    <option key={student.id} value={student.id}>
                                        {student.name} ({student.email})
                                    </option>
                                ))}
                                {availableStudents.length === 0 && (
                                    <option disabled>No eligible students found</option>
                                )}
                            </select>
                            <button
                                onClick={handleAddMember}
                                disabled={!selectedStudentId || loading}
                                className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors text-sm font-medium"
                            >
                                <UserPlus className="w-4 h-4" />
                                Add
                            </button>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <label className="block text-sm font-medium text-gray-700">Current Members ({team.members?.length || 0})</label>
                        <div className="bg-gray-50 rounded-lg border border-gray-200 divide-y divide-gray-200 max-h-60 overflow-y-auto">
                            {team.members && team.members.length > 0 ? (
                                team.members.map(member => (
                                    <div key={member.id} className="p-3 flex items-center justify-between group bg-white">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xs">
                                                {member.name.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <div className="text-sm font-medium text-gray-900">{member.name}</div>
                                                <div className="text-xs text-gray-500">{member.email}</div>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleRemoveMember(member.id)}
                                            disabled={loading}
                                            className="text-gray-400 hover:text-red-600 p-1 rounded-md hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                                            title="Remove member"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))
                            ) : (
                                <div className="p-8 text-center text-gray-400 text-sm">
                                    No members in this team yet.
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 transition-colors"
                    >
                        Done
                    </button>
                </div>
            </div>
        </div>
    );
};
