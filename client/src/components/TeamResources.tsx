import React, { useState, useEffect } from 'react';
import { api, API_BASE } from '../api/client';
import { useToast } from '../contexts/ToastContext';
import { Link2, ExternalLink, Plus, Book, FileText, X, Edit2, Trash2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface ProjectResource {
    id: number;
    project_id: number;
    team_id: number | null;
    task_id: number | null;
    user_id?: number;
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
    const { user } = useAuth();
    const isTeacher = user?.role === 'teacher' || user?.role === 'admin';

    const [teamResources, setTeamResources] = useState<ProjectResource[]>([]);
    const [projectResources, setProjectResources] = useState<ProjectResource[]>([]);
    const [loading, setLoading] = useState(true);
    const { addToast } = useToast();

    // Form state
    const [type, setType] = useState<'link' | 'file'>('file');
    const [url, setUrl] = useState('');
    const [title, setTitle] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [shareWithProject, setShareWithProject] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [editingResource, setEditingResource] = useState<ProjectResource | null>(null);
    
    const cleanUrl = (input: string) => {
        // Strip out any redundant protocols
        return input.replace(/^(https?:\/\/)+/g, '').trim();
    };

    const handleEditResourceClick = (res: ProjectResource) => {
        setEditingResource(res);
        setTitle(res.title);
        // Strip protocol for the edit field
        setUrl(cleanUrl(res.url));
        setType(res.type as 'link' | 'file');
        setFile(null);
        setShareWithProject(res.team_id === null);
        setShowModal(true);
    };

    const handleDeleteResource = async (id: number) => {
        if (!confirm('Are you sure you want to delete this resource?')) return;
        try {
            await api.delete(`/resources/${id}`);
            addToast('Resource deleted', 'success');
            setShowModal(false);
            fetchResources();
        } catch (e) {
            addToast('Failed to delete resource', 'error');
        }
    };

    const getResourceLabel = (res: ProjectResource) => {
        if (res.title) return res.title;
        if (res.type === 'file') {
            const urlParts = res.url.split('/');
            const fileName = urlParts[urlParts.length - 1];
            const match = fileName.match(/res_[^_]+_(.+)/);
            return match ? match[1] : fileName;
        }
        return res.url;
    };

    const fetchResources = async () => {
        try {
            setLoading(true);
            const [teamData, projectData] = await Promise.all([
                api.get<ProjectResource[]>(`/teams/${teamId}/resources`),
                api.get<ProjectResource[]>(`/projects/${projectId}/resources`)
            ]);
            setTeamResources(teamData || []);
            setProjectResources((projectData || []).filter(r => r.team_id === null));
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

        if (type === 'link' && !url.trim()) return;
        if (type === 'file' && !file && !editingResource) return;

        try {
            setIsSubmitting(true);
            let resData;

            if (editingResource) {
                if (type === 'file' && file) {
                    const formData = new FormData();
                    formData.append('file', file);
                    formData.append('title', title.trim() || file.name);

                    const uploadRes = await fetch(`${API_BASE}/resources/${editingResource.id}/upload`, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
                        },
                        body: formData
                    }).then(async (res) => {
                        if (!res.ok) throw new Error('Replacement upload failed');
                        return res.json();
                    });
                    resData = uploadRes.data;
                } else {
                    const finalUrl = `https://${cleanUrl(url)}`;
                    resData = await api.put(`/resources/${editingResource.id}`, {
                        title: title.trim(),
                        url: finalUrl,
                        type: type,
                        team_id: shareWithProject ? null : teamId
                    });
                }

                if (resData && resData.resource) {
                    const updatedRes = resData.resource;
                    setTeamResources(prev => prev.filter(r => r.id !== updatedRes.id));
                    setProjectResources(prev => prev.filter(r => r.id !== updatedRes.id));

                    if (updatedRes.team_id === null) {
                        setProjectResources(prev => [updatedRes, ...prev]);
                    } else {
                        setTeamResources(prev => [updatedRes, ...prev]);
                    }

                    setUrl('');
                    setTitle('');
                    setFile(null);
                    setShareWithProject(false);
                    setShowModal(false);
                    setEditingResource(null);
                    addToast("Resource updated successfully.", "success");
                }
                return;
            }

            if (type === 'file' && file) {
                const formData = new FormData();
                formData.append('file', file);
                formData.append('title', title.trim() || file.name);
                if (!shareWithProject) {
                    formData.append('team_id', teamId.toString());
                }

                const uploadRes = await fetch(`${API_BASE}/projects/${projectId}/resources/upload`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
                    },
                    body: formData
                }).then(async (res) => {
                    if (!res.ok) throw new Error('Upload failed');
                    return res.json();
                });
                resData = uploadRes.data;
            } else {
                const finalUrl = `https://${cleanUrl(url)}`;
                const response = await api.post(`/projects/${projectId}/resources`, {
                    team_id: shareWithProject ? null : teamId,
                    title: title.trim(),
                    url: finalUrl,
                    type: 'link'
                });
                resData = response;
            }

            if (resData && resData.resource) {
                const newRes = resData.resource;
                if (shareWithProject) {
                    setProjectResources([newRes, ...projectResources]);
                } else {
                    setTeamResources([newRes, ...teamResources]);
                }
                setUrl('');
                setTitle('');
                setFile(null);
                setShareWithProject(false);
                setShowModal(false);
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
    const generalTeamResources = teamResources.filter(r => !r.task_id);
    const taskResources = teamResources.filter(r => r.task_id);

    return (
        <div className="h-full flex flex-col p-6 overflow-y-auto w-full max-w-5xl mx-auto space-y-6">

            {/* General Team Resources */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                            <Book className="w-5 h-5 mr-2 text-indigo-600" /> Resources
                        </h2>
                        <p className="text-sm text-gray-500 mt-1">Files and links shared with your team or the entire class.</p>
                    </div>
                    <button
                        onClick={() => {
                            setEditingResource(null);
                            setUrl('');
                            setTitle('');
                            setFile(null);
                            setType('link');
                            setShareWithProject(false);
                            setShowModal(true);
                        }}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center shadow-sm"
                    >
                        <Plus className="w-4 h-4 mr-2" /> Add Resource
                    </button>
                </div>

                <div className="p-6">
                    {/* General Resources List */}
                    {projectResources.length === 0 && generalTeamResources.length === 0 ? (
                        <div className="text-center py-10 bg-white border-2 border-dashed border-gray-200 rounded-xl">
                            <Book className="mx-auto h-12 w-12 text-gray-300" />
                            <h3 className="mt-2 text-sm font-medium text-gray-900">No resources</h3>
                            <p className="mt-1 text-sm text-gray-500">No general resources have been added yet.</p>
                        </div>
                    ) : (
                        <div className="space-y-8">
                            {projectResources.length > 0 && (
                                <div>
                                    <h3 className="text-md font-semibold text-gray-800 mb-3 flex items-center">
                                        <Book className="w-4 h-4 mr-2 text-emerald-600" /> Class Library Resources
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {projectResources.map(res => (
                                            <div key={res.id} className="group relative flex items-start p-4 hover:bg-emerald-50/50 border border-emerald-100 hover:border-emerald-200 rounded-xl transition-all shadow-sm overflow-hidden">
                                                <a
                                                    href={res.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex-1 min-w-0 flex items-start"
                                                >
                                                    <div className="absolute top-0 right-0 bg-emerald-100 text-emerald-800 text-[9px] font-bold uppercase px-2 py-0.5 rounded-bl-lg tracking-wider">Project Library</div>
                                                    <div className="p-2.5 bg-emerald-100 text-emerald-600 rounded-lg mr-4 shrink-0">
                                                        {res.type === 'file' ? <FileText className="w-5 h-5" /> : <Link2 className="w-5 h-5" />}
                                                    </div>
                                                    <div className="flex-1 min-w-0 mt-1">
                                                        <h4 className="text-gray-900 font-medium text-sm truncate group-hover:text-emerald-700 relative pr-6">
                                                            {getResourceLabel(res)}
                                                            <ExternalLink className="w-3.5 h-3.5 absolute right-0 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                        </h4>
                                                        <p className="text-gray-500 text-xs mt-1 truncate">{res.url}</p>
                                                        <p className="text-gray-400 text-xs mt-2 uppercase tracking-wide">
                                                            Added {new Date(res.created_at).toLocaleDateString()}
                                                        </p>
                                                    </div>
                                                </a>
                                                {(isTeacher || res.user_id === user?.id) && (
                                                    <div className="absolute right-4 bottom-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2 z-10">
                                                        <button onClick={(e) => { e.preventDefault(); handleEditResourceClick(res); }} className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-white rounded-lg transition-colors shadow-sm border border-gray-200 bg-gray-50">
                                                            <Edit2 className="w-4 h-4" />
                                                        </button>
                                                        <button onClick={(e) => { e.preventDefault(); handleDeleteResource(res.id); }} className="p-2 text-gray-500 hover:text-red-600 hover:bg-white rounded-lg transition-colors shadow-sm border border-gray-200 bg-gray-50">
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {generalTeamResources.length > 0 && (
                                <div>
                                    <h3 className="text-md font-semibold text-gray-800 mb-3 flex items-center">
                                        <Book className="w-4 h-4 mr-2 text-indigo-600" /> Team Specific Resources
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {generalTeamResources.map(res => (
                                            <div key={res.id} className="group relative flex items-start p-4 hover:bg-indigo-50/50 border border-gray-100 hover:border-indigo-100 rounded-xl transition-all overflow-hidden">
                                                <a
                                                    href={res.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex-1 min-w-0 flex items-start"
                                                >
                                                    <div className="p-2.5 bg-indigo-100 text-indigo-600 rounded-lg mr-4 shrink-0">
                                                        {res.type === 'file' ? <FileText className="w-5 h-5" /> : <Link2 className="w-5 h-5" />}
                                                    </div>
                                                    <div className="flex-1 min-w-0 mt-1">
                                                        <h4 className="text-gray-900 font-medium text-sm truncate group-hover:text-indigo-700 relative pr-6">
                                                            {getResourceLabel(res)}
                                                            <ExternalLink className="w-3.5 h-3.5 absolute right-0 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                        </h4>
                                                        <p className="text-gray-500 text-xs mt-1 truncate">{res.url}</p>
                                                        <p className="text-gray-400 text-xs mt-2 uppercase tracking-wide">
                                                            Added {new Date(res.created_at).toLocaleDateString()}
                                                        </p>
                                                    </div>
                                                </a>
                                                {(isTeacher || res.user_id === user?.id) && (
                                                    <div className="absolute right-4 bottom-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2 z-10">
                                                        <button onClick={(e) => { e.preventDefault(); handleEditResourceClick(res); }} className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-white rounded-lg transition-colors shadow-sm border border-gray-200 bg-gray-50">
                                                            <Edit2 className="w-4 h-4" />
                                                        </button>
                                                        <button onClick={(e) => { e.preventDefault(); handleDeleteResource(res.id); }} className="p-2 text-gray-500 hover:text-red-600 hover:bg-white rounded-lg transition-colors shadow-sm border border-gray-200 bg-gray-50">
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Task Resources */}
            {
                taskResources.length > 0 && (
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
                                                        {res.type === 'file' ? <FileText className="w-4 h-4" /> : <Link2 className="w-4 h-4" />}
                                                    </div>
                                                    <a href={res.url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-indigo-600 hover:text-indigo-900 truncate max-w-xs block">
                                                        {getResourceLabel(res)}
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
                )
            }

            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <h2 className="text-lg font-bold text-gray-900">{editingResource ? 'Edit Resource' : 'Add a New Resource'}</h2>
                            <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6">
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-2 ml-1">Resource Type</label>
                                    <div className="flex bg-gray-100 p-1 rounded-lg">
                                        <button
                                            type="button"
                                            onClick={() => setType('file')}
                                            className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-all ${type === 'file' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                        >
                                            <FileText className="w-4 h-4" />
                                            Document
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setType('link')}
                                            className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-all ${type === 'link' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                        >
                                            <Link2 className="w-4 h-4" />
                                            Link
                                        </button>
                                    </div>
                                </div>
                                {type === 'link' ? (
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500 mb-1 ml-1">URL / Link Location *</label>
                                        <div className="flex">
                                            <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
                                                https://
                                            </span>
                                            <input 
                                                type="text" 
                                                required 
                                                value={url} 
                                                onChange={(e) => setUrl(cleanUrl(e.target.value))} 
                                                placeholder="example.com/research"
                                                className="flex-1 text-sm p-3 border border-gray-300 rounded-none rounded-r-md focus:ring-1 focus:ring-indigo-500 outline-none"
                                            />
                                        </div>
                                    </div>
                                ) : (
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500 mb-1 ml-1">
                                            {editingResource ? 'Replace File (Optional)' : 'Upload File *'}
                                        </label>
                                        {editingResource && editingResource.type === 'file' && (
                                            <div className="mb-3 p-2.5 bg-indigo-50 rounded-lg border border-indigo-100 flex items-center justify-between shadow-sm">
                                                <div className="flex items-center gap-2 overflow-hidden">
                                                    <div className="bg-indigo-100 p-1.5 rounded-md">
                                                        <FileText className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                                                    </div>
                                                    <span className="text-[11px] text-indigo-800 truncate font-semibold">Current: {editingResource.url.split('/').pop()}</span>
                                                </div>
                                                <a 
                                                    href={editingResource.url} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer"
                                                    className="text-[10px] text-indigo-600 hover:text-indigo-800 underline font-black bg-white px-2 py-1 rounded border border-indigo-200 shadow-sm ml-2 shrink-0 transition-colors"
                                                >
                                                    View Current
                                                </a>
                                            </div>
                                        )}
                                        <input
                                            type="file"
                                            required={!editingResource}
                                            onChange={(e) => setFile(e.target.files?.[0] || null)}
                                            className="w-full text-sm p-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white shadow-sm"
                                        />
                                        <p className="text-[10px] text-gray-500 mt-1.5 ml-1 flex items-center gap-1">
                                            <span className="inline-block w-1 h-1 bg-gray-400 rounded-full"></span>
                                            {editingResource 
                                                ? "New upload will permanently replace existing file." 
                                                : "Document will be shared with the team/project."}
                                        </p>
                                    </div>
                                )}
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
                                <div className="flex items-center mt-2 ml-1">
                                    <input
                                        type="checkbox"
                                        id="shareWithProjectModal"
                                        checked={shareWithProject}
                                        onChange={(e) => setShareWithProject(e.target.checked)}
                                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                                    />
                                    <label htmlFor="shareWithProjectModal" className="ml-2 block text-sm text-gray-700 font-medium cursor-pointer">
                                        Share with entire Project Class
                                    </label>
                                </div>
                            </div>
                            <div className="mt-8 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting || (type === 'link' ? !url.trim() : (!file && !editingResource))}
                                    className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center shadow-sm"
                                >
                                    {isSubmitting ? 'Saving...' : (editingResource ? 'Save Changes' : 'Add Resource')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
