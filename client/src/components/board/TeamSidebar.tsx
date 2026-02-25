import React from 'react';
import { Users, BookOpen } from 'lucide-react';

interface TeamMember {
    id: number;
    name: string;
    role: string;
    avatar?: string;
}

interface TeamSidebarProps {
    teamName: string;
    members: TeamMember[];
}

export const TeamSidebar: React.FC<TeamSidebarProps> = ({ teamName, members }) => {
    return (
        <div className="w-64 bg-white border-l border-gray-200 h-full flex flex-col">
            <div className="p-4 border-b border-gray-100">
                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">{teamName}</h3>

                <div className="space-y-4">
                    {members.map(member => (
                        <div key={member.id} className="flex items-center space-x-3">
                            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xs">
                                {member.name.charAt(0)}
                            </div>
                            <div>
                                <div className="text-sm font-medium text-gray-900">{member.name}</div>
                                <div className="text-xs text-gray-500">{member.role || 'Team Member'}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="p-4">
                <button className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                    <BookOpen className="w-4 h-4 mr-2" />
                    Need-to-Know Log
                </button>
            </div>
        </div>
    );
};
