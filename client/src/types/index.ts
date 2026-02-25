export interface User {
    id: number;
    name: string;
    first_name: string;
    last_name: string;
    email: string;
    role: 'teacher' | 'student';
}

export interface Class {
    id: number;
    name: string;
    teacher_id: number;
    created_at?: string;
    deleted_at?: string; // Added for soft delete
    students?: User[]; // Optional, present in detailed view
}

export interface Project {
    id: number;
    title: string;
    driving_question: string;
    description?: string;
    teacher_id: number;
    class_id?: number; // Virtual property from API
    due_date?: string;
    start_date?: string; // Added for timeline
    created_at?: string; // Added for timeline
    end_date?: string;   // Added for timeline
    classes?: { id: number; name: string }[];
    requires_reflection?: boolean;
    requires_milestone_reflection?: boolean;
    require_critique?: boolean;
    deleted_at?: string; // Added for soft delete
    default_tasks?: { title: string; description?: string }[];
}

export interface Team {
    id: number;
    project_id: number;
    name: string;
    class_id?: number;
    class_name?: string;
    members: number[]; // User IDs
}

export interface Task {
    id: number;
    project_id: number;
    title: string;
    description: string;
    status: 'todo' | 'in_progress' | 'review' | 'done';
    assignee_id?: number;
    assignee_name?: string;
    team_id?: number;
    due_date?: string;
    created_at?: string;
    updated_at?: string;
    dependencies?: number[];
    start_date?: string;
    end_date?: string; // Added
    duration_days?: number;
    is_blocked?: boolean; // Virtual property
    is_completable?: boolean; // Virtual property for gatekeeping
    deleted_at?: string; // Added
}

export interface Milestone {
    id: number;
    project_id: number;
    title: string;
    due_date?: string;
    is_hard_deadline: boolean;
}

export interface ProjectTimeline {
    project: {
        id: number;
        title: string;
        start_date: string | null;
        end_date: string | null;
    };
    tasks: Task[];
    milestones: Milestone[];
}

export interface Checkpoint {
    id: number;
    project_id: number;
    title: string;
    due_date?: string;
}

export interface Reflection {
    id: number;
    user_id: number;
    checkpoint_id: number;
    type: 'content' | 'process' | 'purpose';
    content: string;
    submitted_at?: string;
}

export interface TaskReflection {
    id: number;
    task_id: number;
    user_id: number;
    content: string;
    created_at?: string;
}

export interface ProjectResource {
    id: number;
    project_id: number;
    task_id?: number;
    title: string;
    url: string;
    type: 'link' | 'file';
    created_at?: string;
}
