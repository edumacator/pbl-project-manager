import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, useParams } from 'react-router-dom';
import { api } from '../api/client';
import { Project, Class } from '../types';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';

const CreateProject: React.FC = () => {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const isEditMode = !!id;
    const [searchParams] = useSearchParams();
    const preselectedClassId = searchParams.get('class_id');

    const [title, setTitle] = useState('');
    const [dq, setDq] = useState('');
    const [description, setDescription] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [requiresReflection, setRequiresReflection] = useState(false);
    const [requiresMilestoneReflection, setRequiresMilestoneReflection] = useState(false);
    const [requireCritique, setRequireCritique] = useState(false);
    const [selectedClassIds, setSelectedClassIds] = useState<string[]>(preselectedClassId ? [preselectedClassId] : []);
    const [classes, setClasses] = useState<Class[]>([]);

    // Milestones state. Include ID for editing.
    const [milestones, setMilestones] = useState<{ id?: number; title: string; due_date: string; description?: string }[]>([]);

    // Default tasks state
    const [defaultTasks, setDefaultTasks] = useState<{ title: string; description?: string }[]>([]);

    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(false);

    const editor = useEditor({
        extensions: [StarterKit],
        content: description,
        onUpdate: ({ editor }) => {
            setDescription(editor.getHTML());
        },
        editorProps: {
            attributes: {
                class: 'prose prose-sm sm:prose-base max-w-none focus:outline-none min-h-[150px] p-4 bg-white rounded-b-lg border-t-0 border border-gray-300',
            },
        },
    });

    useEffect(() => {
        document.title = isEditMode ? "Edit Project | PBL Manager" : "Create Project | PBL Manager";

        // Fetch classes
        api.get<Class[]>('/classes')
            .then(data => setClasses(data || []))
            .catch(err => console.error(err));

        if (isEditMode) {
            setInitialLoading(true);
            // Fetch project details
            Promise.all([
                api.get<{ project: Project }>(`/projects/${id}`),
                api.get<any[]>(`/projects/${id}/checkpoints`) // Fetch milestones
            ])
                .then(([projectData, checkpoints]) => {
                    const project = projectData.project;
                    if (project) {
                        setTitle(project.title);
                        setDq(project.driving_question);
                        setDescription(project.description || '');
                        if (editor && project.description) {
                            editor.commands.setContent(project.description);
                        }
                        setDueDate(project.due_date ? project.due_date.substring(0, 10) : '');
                        setRequiresReflection(!!project.requires_reflection);
                        setRequiresMilestoneReflection(!!project.requires_milestone_reflection);
                        setRequireCritique(!!project.require_critique);

                        // Populate assigned classes
                        if (project.classes && Array.isArray(project.classes)) {
                            // The repository returns array of { id, name }
                            // We need to map to string IDs
                            setSelectedClassIds(project.classes.map((c: any) => String(c.id)));
                        }

                        // Populate milestones
                        if (checkpoints) {
                            setMilestones(checkpoints.map(cp => ({
                                id: cp.id,
                                title: cp.title,
                                due_date: cp.due_date ? cp.due_date.substring(0, 10) : '',
                                description: cp.description || ''
                            })));
                        }

                        // Populate default tasks
                        if (project.default_tasks) {
                            setDefaultTasks(project.default_tasks);
                        }
                    }
                })
                .catch(() => setError('Failed to load project'))
                .finally(() => setInitialLoading(false));
        }
    }, [id, isEditMode, editor]); // Added editor to dependency array

    const toggleClassSelection = (id: string) => {
        setSelectedClassIds(prev =>
            prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
        );
    };

    const addMilestone = () => {
        setMilestones([...milestones, { title: '', due_date: '' }]);
    };

    const removeMilestone = (index: number) => {
        setMilestones(milestones.filter((_, i) => i !== index));
    };

    const updateMilestone = (index: number, field: 'title' | 'due_date' | 'description', value: string) => {
        const newMilestones = [...milestones];
        newMilestones[index][field] = value;
        setMilestones(newMilestones);
    };

    const addDefaultTask = () => setDefaultTasks([...defaultTasks, { title: '' }]);
    const removeDefaultTask = (index: number) => setDefaultTasks(defaultTasks.filter((_, i) => i !== index));
    const updateDefaultTask = (index: number, field: 'title' | 'description', value: string) => {
        const newTasks = [...defaultTasks];
        newTasks[index][field] = value;
        setDefaultTasks(newTasks);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const formData = new FormData(e.target as HTMLFormElement);
            const dueDate = formData.get('due_date') as string;

            const payload = {
                title,
                driving_question: dq,
                description,
                teacher_id: 1, // Hardcoded auth
                class_ids: selectedClassIds.map(Number),
                due_date: dueDate || null,
                requires_reflection: requiresReflection,
                requires_milestone_reflection: requiresMilestoneReflection,
                require_critique: requireCritique,
                milestones: milestones.filter(m => m.title.trim() !== ''),
                default_tasks: defaultTasks.filter(t => t.title.trim() !== '')
            };

            let res;
            if (isEditMode) {
                res = await api.put<{ project: Project }>(`/projects/${id}`, payload);
            } else {
                res = await api.post<{ project: Project }>('/projects', payload);
            }

            window.dispatchEvent(new CustomEvent('projects-changed'));
            navigate(`/projects/${res.project.id}`);
        } catch (err: any) {
            setError(err.message || 'Failed to save project');
        } finally {
            setLoading(false);
        }
    };

    if (initialLoading) return <div className="p-8">Loading...</div>;

    return (
        <div className="max-w-2xl mx-auto bg-white p-8 rounded-xl shadow-sm border border-gray-200">
            <h2 className="text-2xl font-bold mb-6">{isEditMode ? 'Edit Project' : 'Create New Project'}</h2>

            {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg">{error}</div>}

            <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Project Title</label>
                    <input
                        type="text"
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="e.g. Mars Colony Habitat"
                        required
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Driving Question</label>
                    <p className="text-xs text-gray-500 mb-1">The central question that guides the project and engages students.</p>
                    <input
                        type="text"
                        value={dq}
                        onChange={e => setDq(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="e.g. How can we sustain life on another planet?"
                        required
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Project Description (Optional)</label>
                    <p className="text-xs text-gray-500 mb-2">Detailed instructions, context, or scenario for the project.</p>
                    <div className="rounded-lg shadow-sm focus-within:ring-2 focus-within:ring-indigo-500">
                        {/* Simple Toolbar */}
                        <div className="flex flex-wrap gap-1 bg-gray-50 p-2 border border-gray-300 rounded-t-lg border-b-0">
                            <button
                                type="button"
                                onClick={() => editor?.chain().focus().toggleBold().run()}
                                className={`px-2 py-1 rounded text-sm font-bold ${editor?.isActive('bold') ? 'bg-indigo-100 text-indigo-700' : 'hover:bg-gray-200 text-gray-700'}`}
                            >B</button>
                            <button
                                type="button"
                                onClick={() => editor?.chain().focus().toggleItalic().run()}
                                className={`px-2 py-1 rounded text-sm italic ${editor?.isActive('italic') ? 'bg-indigo-100 text-indigo-700' : 'hover:bg-gray-200 text-gray-700'}`}
                            >I</button>
                            <button
                                type="button"
                                onClick={() => editor?.chain().focus().toggleStrike().run()}
                                className={`px-2 py-1 rounded text-sm line-through ${editor?.isActive('strike') ? 'bg-indigo-100 text-indigo-700' : 'hover:bg-gray-200 text-gray-700'}`}
                            >S</button>
                            <div className="w-px h-6 bg-gray-300 mx-1 self-center"></div>
                            <button
                                type="button"
                                onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
                                className={`px-2 py-1 rounded text-sm font-semibold ${editor?.isActive('heading', { level: 2 }) ? 'bg-indigo-100 text-indigo-700' : 'hover:bg-gray-200 text-gray-700'}`}
                            >H2</button>
                            <button
                                type="button"
                                onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}
                                className={`px-2 py-1 rounded text-sm font-semibold ${editor?.isActive('heading', { level: 3 }) ? 'bg-indigo-100 text-indigo-700' : 'hover:bg-gray-200 text-gray-700'}`}
                            >H3</button>
                            <div className="w-px h-6 bg-gray-300 mx-1 self-center"></div>
                            <button
                                type="button"
                                onClick={() => editor?.chain().focus().toggleBulletList().run()}
                                className={`px-2 py-1 rounded text-sm ${editor?.isActive('bulletList') ? 'bg-indigo-100 text-indigo-700' : 'hover:bg-gray-200 text-gray-700'}`}
                            >• List</button>
                            <button
                                type="button"
                                onClick={() => editor?.chain().focus().toggleOrderedList().run()}
                                className={`px-2 py-1 rounded text-sm ${editor?.isActive('orderedList') ? 'bg-indigo-100 text-indigo-700' : 'hover:bg-gray-200 text-gray-700'}`}
                            >1. List</button>
                        </div>
                        <EditorContent editor={editor} />
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-4 bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <div className="flex items-center gap-3">
                        <input
                            type="checkbox"
                            id="requiresReflection"
                            checked={requiresReflection}
                            onChange={e => setRequiresReflection(e.target.checked)}
                            className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                        />
                        <div className="flex items-center gap-2 group relative">
                            <label htmlFor="requiresReflection" className="text-sm font-medium text-gray-700 cursor-pointer user-select-none">
                                Require Reflection on Tasks
                            </label>
                            <div className="cursor-help text-gray-400 hover:text-indigo-600">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
                                </svg>
                            </div>
                            {/* Tooltip */}
                            <div className="absolute left-0 bottom-full mb-2 w-64 p-2 bg-gray-800 text-white text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                                Prompts students to briefly pause and record their learning or challenges after completing a task, fostering habituated metacognition.
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <input
                            type="checkbox"
                            id="requiresMilestoneReflection"
                            checked={requiresMilestoneReflection}
                            onChange={e => setRequiresMilestoneReflection(e.target.checked)}
                            className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                        />
                        <div className="flex items-center gap-2 group relative">
                            <label htmlFor="requiresMilestoneReflection" className="text-sm font-medium text-gray-700 cursor-pointer user-select-none">
                                Require Reflection on Milestones
                            </label>
                            <div className="cursor-help text-gray-400 hover:text-indigo-600">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
                                </svg>
                            </div>
                            <div className="absolute left-0 bottom-full mb-2 w-64 p-2 bg-gray-800 text-white text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                                Asks students to synthesize their learning across multiple tasks, connecting immediate work to the broader project goals.
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <input
                            type="checkbox"
                            id="requireCritique"
                            checked={requireCritique}
                            onChange={e => setRequireCritique(e.target.checked)}
                            className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                        />
                        <div className="flex items-center gap-2 group relative">
                            <label htmlFor="requireCritique" className="text-sm font-medium text-gray-700 cursor-pointer user-select-none">
                                Require Peer Critique (Gatekeeper)
                            </label>
                            <div className="cursor-help text-gray-400 hover:text-indigo-600">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
                                </svg>
                            </div>
                            <div className="absolute left-0 bottom-full mb-2 w-64 p-2 bg-gray-800 text-white text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                                Prevents task completion until a peer has provided "Warm & Cool" feedback. Ensures verification and refinement before "Done".
                            </div>
                        </div>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Due Date (Optional)</label>
                    <input
                        type="date"
                        name="due_date"
                        value={dueDate}
                        onChange={e => setDueDate(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Project Milestones (Optional)</label>
                    <p className="text-xs text-gray-500 mb-2">Define standard milestones for this project (e.g., "Rough Draft", "Final Polish"). Teams will see these on their timeline.</p>

                    <div className="space-y-3 mb-3">
                        {milestones.map((m, idx) => (
                            <div key={idx} className="flex gap-2 items-start">
                                <input
                                    type="text"
                                    placeholder="Milestone Title"
                                    value={m.title}
                                    onChange={e => updateMilestone(idx, 'title', e.target.value)}
                                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                                    required
                                />
                                <input
                                    type="text"
                                    placeholder="Description (Optional)"
                                    value={m.description || ''}
                                    onChange={e => updateMilestone(idx, 'description', e.target.value)}
                                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                                />
                                <input
                                    type="date"
                                    value={m.due_date}
                                    onChange={e => updateMilestone(idx, 'due_date', e.target.value)}
                                    className="w-40 px-3 py-2 border border-gray-300 rounded-md text-sm"
                                />
                                <button
                                    type="button"
                                    onClick={() => removeMilestone(idx)}
                                    className="p-2 text-gray-400 hover:text-red-500"
                                >
                                    &times;
                                </button>
                            </div>
                        ))}
                    </div>

                    <button
                        type="button"
                        onClick={addMilestone}
                        className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
                    >
                        + Add Milestone
                    </button>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Default Tasks (Optional)</label>
                    <p className="text-xs text-gray-500 mb-2">Configure standard tasks that will be automatically assigned to any newly created team.</p>

                    <div className="space-y-3 mb-3">
                        {defaultTasks.map((t, idx) => (
                            <div key={idx} className="flex gap-2 items-start">
                                <input
                                    type="text"
                                    placeholder="Task Title"
                                    value={t.title}
                                    onChange={e => updateDefaultTask(idx, 'title', e.target.value)}
                                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                                    required
                                />
                                <input
                                    type="text"
                                    placeholder="Description (Optional)"
                                    value={t.description || ''}
                                    onChange={e => updateDefaultTask(idx, 'description', e.target.value)}
                                    className="flex-[2] px-3 py-2 border border-gray-300 rounded-md text-sm"
                                />
                                <button
                                    type="button"
                                    onClick={() => removeDefaultTask(idx)}
                                    className="p-2 text-gray-400 hover:text-red-500"
                                >
                                    &times;
                                </button>
                            </div>
                        ))}
                    </div>

                    <button
                        type="button"
                        onClick={addDefaultTask}
                        className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
                    >
                        + Add Default Task
                    </button>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Assign to Classes (Optional)</label>
                    <div className="border border-gray-300 rounded-lg p-3 max-h-48 overflow-y-auto space-y-2">
                        {classes.length === 0 ? (
                            <p className="text-sm text-gray-500">No classes found.</p>
                        ) : (
                            classes.map(cls => (
                                <label key={cls.id} className="flex items-center space-x-3 cursor-pointer p-1 hover:bg-gray-50 rounded">
                                    <input
                                        type="checkbox"
                                        value={cls.id}
                                        checked={selectedClassIds.includes(String(cls.id))}
                                        onChange={() => toggleClassSelection(String(cls.id))}
                                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                                    />
                                    <span className="text-sm text-gray-700">{cls.name}</span>
                                </label>
                            ))
                        )}
                    </div>
                </div>

                <div className="pt-4 flex justify-end">
                    <button
                        type="submit"
                        disabled={loading}
                        className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                    >
                        {loading ? (isEditMode ? 'Saving...' : 'Creating...') : (isEditMode ? 'Save Changes' : 'Create Project')}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default CreateProject;
