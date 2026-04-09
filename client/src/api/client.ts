export const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

type ApiResponse<T> = {
    ok: boolean;
    data?: T;
    error?: {
        code: string;
        message: string;
    };
};

export const request = async <T = any>(url: string, options: RequestInit = {}): Promise<T> => {
    const token = localStorage.getItem('auth_token');

    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...options?.headers as Record<string, string>,
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE}${url}`, {
        ...options,
        headers,
    });

    if ((response.status === 401 || response.status === 403) && !url.includes('/auth/login')) {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
        localStorage.setItem('session_expired', 'true');
        window.location.href = '/login';
        throw new Error('Session expired or unauthorized');
    }

    const json: ApiResponse<T> = await response.json();

    if (!json.ok) {
        throw new Error(json.error?.message || 'API Error');
    }

    return json.data as T;
}

export const api = {
    get: <T>(url: string) => request<T>(url),
    post: <T>(url: string, body: any) =>
        request<T>(url, { method: 'POST', body: JSON.stringify(body) }),
    put: <T>(url: string, body: any) =>
        request<T>(url, { method: 'PUT', body: JSON.stringify(body) }),
    patch: <T>(url: string, body: any) =>
        request<T>(url, { method: 'PATCH', body: JSON.stringify(body) }),
    delete: <T>(url: string) => request<T>(url, { method: 'DELETE' }),

    // Tasks
    updateTask: (taskId: number, data: Partial<any>) =>
        request<{ task: any }>(`/tasks/${taskId}`, { method: 'PATCH', body: JSON.stringify(data) }),
    
    hardDeleteTask: (taskId: number) =>
        request<{ deleted: boolean }>(`/tasks/${taskId}/hard`, { method: 'DELETE' }),

    // Task Feedback
    submitFeedback: (taskId: number, data: { warm_feedback: string; cool_feedback: string; requires_revision: boolean }) =>
        request(`/tasks/${taskId}/feedback`, {
            method: 'POST',
            body: JSON.stringify(data)
        }),

    // Task Reflection
    saveTaskReflection: (taskId: number, content: string, transitionType: string) =>
        request(`/tasks/${taskId}/reflections`, {
            method: 'POST',
            body: JSON.stringify({ content, transition_type: transitionType })
        }),

    // Stuck Protocol
    logStuckAction: (taskId: number, data: { reason: string; action_taken: string; next_action_text: string }) =>
        request<{ log_id: number }>(`/tasks/${taskId}/stuck-log`, {
            method: 'POST',
            body: JSON.stringify(data)
        }),
    
    getStuckLogs: (taskId: number) =>
        request<any[]>(`/tasks/${taskId}/stuck-log`, { method: 'GET' }),
};
