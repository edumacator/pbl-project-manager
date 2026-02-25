import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { useToast } from '../contexts/ToastContext';
import { Link as LinkIcon, ExternalLink, Plus, Book, FileText } from 'lucide-react';

interface ProjectResource {
    id: number;
    project_id: number;
    team_id: number | null;
    task_id: number | null;
    title: string;
    url: string;
    type: 'link' | 'file';
    created_at: string;
}

interface TeamResourcesProps {
    teamId: number;
    projectId: number;
}

export const TeamResources: React.FC<TeamResourcesProps> = ({ teamId, projectId }) => {
    const [resources, setResources] = useState<ProjectResource[]>([]);
    const [loading, setLoading] = useState(true);
    const { addToast } = useToast();

    // Form state
    const [url, setUrl] = useState('');
    const [title, setTitle] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const fetchResources = async () => {
        try {
            setLoading(true);
            const data = await api.get<ProjectResource[]>(`/teams/${teamId}/resources`);
            setResources(data || []);
        } catch (error) {
            addToast("Failed to load team resources.", "error");
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchResources();
    }, [teamId]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!url.trim()) return;

        try {
            setIsSubmitting(true);
            const resData = await api.post(`/projects/${projectId}/resources`, {
                team_id: teamId,
                title: title.trim(),
                url: url.trim(),
                type: 'link' // Assuming link for now based on user's placeholder note
            });

            if (resData && (resData as any).data?.resource) {
                setResources([(resData as any).data.resource, ...resources]);
                setUrl('');
                setTitle('');
                addToast("Resource added successfully.", "success");
            }
        } catch (error) {
            addToast("Failed to add resource.", "error");
            console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) {
        return <div className="p-8 text-center text-gray-500">Loading resources...</div>;
    }

    // Separate general resources from task resources
    const generalResources = resources.filter(r => !r.task_id);
    const taskResources = resources.filter(r => r.task_id);

    return (
        <div className="h-full flex flex-col p-6 overflow-y-auto w-full max-w-5xl mx-auto space-y-6">

            {/* General Team Resources */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                            <Book className="w-5 h-5 mr-2 text-indigo-600" /> General Resources
                        </h2>
                        <p className="text-sm text-gray-500 mt-1">Files and links shared with the entire team.</p>
                    </div>
                </div>

                <div className="p-6">
                    {/* Upload Form */}
                    <form onSubmit={handleSubmit} className="mb-8 border border-gray-100 rounded-xl p-5 bg-gray-50">
                        <h3 className="text-sm font-medium text-gray-900 mb-4">Add a new resource</h3>
                        <div className="flex gap-4 items-start">
                            <div className="flex-1 space-y-4">
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1 ml-1">URL / Link Location</label>
                                    <input
                                        type="url"
                                        required
                                        value={url}
                                        onChange={(e) => setUrl(e.target.value)}
                                        placeholder="https://..."
                                        className="w-full text-sm p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1 ml-1">Title (Optional)</label>
                                    <input
                                        type="text"
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        placeholder="e.g. Research Document"
                                        className="w-full text-sm p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                    />
                                </div>
                            </div>
                            <div className="mt-6 pt-1">
                                <button
                                    type="submit"
                                    disabled={!url.trim() || isSubmitting}
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-3 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center"
                                >
                                    {isSubmitting ? 'Adding...' : <><Plus className="w-4 h-4 mr-2" /> Add Resource</>}
                                </button>
                            </div>
                        </div>
                    </form>

                    {/* General Resources List */}
                    {generalResources.length === 0 ? (
                        <div className="text-center py-10 bg-white border-2 border-dashed border-gray-200 rounded-xl">
                            <Book className="mx-auto h-12 w-12 text-gray-300" />
                            <h3 className="mt-2 text-sm font-medium text-gray-900">No resources</h3>
                            <p className="mt-1 text-sm text-gray-500">Your team hasn't added any general resources yet.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {generalResources.map(res => (
                                <a
                                    key={res.id}
                                    href={res.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="group flex items-start p-4 hover:bg-indigo-50/50 border border-gray-100 hover:border-indigo-100 rounded-xl transition-all"
                                >
                                    <div className="p-2.5 bg-indigo-100 text-indigo-600 rounded-lg mr-4 shrink-0">
                                        {res.type === 'file' ? <FileText className="w-5 h-5" /> : <LinkIcon className="w-5 h-5" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="text-gray-900 font-medium text-sm truncate group-hover:text-indigo-700 relative pr-6">
                                            {res.title || res.url}
                                            <ExternalLink className="w-3.5 h-3.5 absolute right-0 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </h4>
                                        <p className="text-gray-500 text-xs mt-1 truncate">{res.url}</p>
                                        <p className="text-gray-400 text-xs mt-2 uppercase tracking-wide">
                                            Added {new Date(res.created_at).toLocaleDateString()}
                                        </p>
                                    </div>
                                </a>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Task Resources */}
            {taskResources.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/50">
                        <h2 className="text-lg font-semibold text-gray-900">Task Attachments</h2>
                        <p className="text-sm text-gray-500 mt-1">Resources attached to specific tasks in your workflow.</p>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Resource</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Type</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Related Task ID</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Added</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {taskResources.map((res) => (
                                    <tr key={res.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <div className="shrink-0 flex items-center justify-center p-1.5 rounded-md bg-gray-100 text-gray-500 mr-3">
                                                    {res.type === 'file' ? <FileText className="w-4 h-4" /> : <LinkIcon className="w-4 h-4" />}
                                                </div>
                                                <a href={res.url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-indigo-600 hover:text-indigo-900 truncate max-w-xs">
                                                    {res.title || res.url}
                                                </a>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800 uppercase">
                                                {res.type}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            Task #{res.task_id}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {new Date(res.created_at).toLocaleDateString()}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};
