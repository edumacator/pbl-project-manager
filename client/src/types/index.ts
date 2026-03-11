export interface User {
    id: number;
    name: string;
    first_name: string;
    last_name: string;
    email: string;
    role: 'teacher' | 'student' | 'admin';
}

export interface Class {
    id: number;
    name: string;
    teacher_id: number;
    join_code?: string; // Access code for students
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
    status: 'todo' | 'doing' | 'done';
    assignee_id?: number;
    assignee_name?: string;
    team_id?: number;
    due_date?: string;
    created_at?: string;
    dependencies?: number[];
    start_date?: string;
    priority?: 'P1' | 'P2' | 'P3';
    end_date?: string; // Added
    is_stuck?: boolean; // Added
    duration_days?: number;
    sort_order?: number; // Added
    is_blocked?: boolean; // Virtual property
    is_completable?: boolean; // Virtual property for gatekeeping
    deleted_at?: string; // Added
    checklist?: TaskChecklistItem[]; // Added
    checklist_summary?: { total: number; completed: number }; // Added
}

export interface TaskChecklistItem {
    id: number;
    task_id: number;
    content: string;
    is_completed: boolean;
    sort_order: number;
    created_at?: string;
    updated_at?: string;
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
    transition_type: 'start_work' | 'finish_task';
    content: string;
    created_at?: string;
    user_name?: string;
}

export interface ProjectResource {
    id: number;
    project_id: number;
    team_id?: number;
    task_id?: number;
    user_id?: number;
    title: string;
    url: string;
    type: 'link' | 'file';
    description?: string;
    created_at?: string;
}

export interface TaskMessage {
    id: number;
    task_id: number;
    user_id: number;
    message: string;
    visibility?: 'team' | 'teacher';
    is_system: boolean;
    created_at: string;
    user_name?: string;
}

