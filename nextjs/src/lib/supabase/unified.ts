import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@/lib/types";

export enum ClientType {
    SERVER = 'server',
    SPA = 'spa'
}

export class SassClient {
    private client: SupabaseClient<Database, "public", "public">;
    private clientType: ClientType;

    constructor(client: SupabaseClient<Database, "public", "public">, clientType: ClientType) {
        this.client = client;
        this.clientType = clientType;
    }

    // --- Helper for API Calls ---
    private async apiRequest(endpoint: string, method: string = 'GET', body?: unknown) {
        const res = await fetch(`/api${endpoint}`, {
            method,
            headers: {
                'Content-Type': 'application/json',
            },
            body: body ? JSON.stringify(body) : undefined,
        });

        if (!res.ok) {
            // Try to parse error
            let errorMsg = res.statusText;
            try {
                const json = await res.json();
                if (json.error) errorMsg = json.error;
            } catch { }
            return { data: null, error: { message: errorMsg } };
        }

        const data = await res.json();
        return { data, error: null };
    }

    // --- Auth (Keep Supabase Client - Best Practice) ---

    async loginEmail(email: string, password: string) {
        return this.client.auth.signInWithPassword({
            email: email,
            password: password
        });
    }

    async registerEmail(email: string, password: string, fullName: string = '') {
        return this.client.auth.signUp({
            email: email,
            password: password,
            options: {
                data: {
                    full_name: fullName
                }
            }
        });
    }

    async exchangeCodeForSession(code: string) {
        return this.client.auth.exchangeCodeForSession(code);
    }

    async resendVerificationEmail(email: string) {
        return this.client.auth.resend({
            email: email,
            type: 'signup'
        })
    }

    async logout() {
        const { error } = await this.client.auth.signOut({
            scope: 'local',
        });
        if (error) throw error;
        if (this.clientType === ClientType.SPA) {
            window.location.href = '/auth/login';
        }
    }

    // --- Files (Keep Supabase Storage Client - Efficient) ---

    async uploadFile(myId: string, filename: string, file: File) {
        filename = filename.replace(/[^0-9a-zA-Z!\-_.*'()]/g, '_');
        filename = myId + "/" + filename
        return this.client.storage.from('files').upload(filename, file);
    }

    async getFiles(myId: string) {
        return this.client.storage.from('files').list(myId)
    }

    async deleteFile(myId: string, filename: string) {
        filename = myId + "/" + filename
        return this.client.storage.from('files').remove([filename])
    }

    async shareFile(myId: string, filename: string, timeInSec: number, forDownload: boolean = false) {
        filename = myId + "/" + filename
        return this.client.storage.from('files').createSignedUrl(filename, timeInSec, {
            download: forDownload
        });
    }

    // --- Todo List (Legacy - Removed or Not Used) ---
    async getMyTodoList() { return { data: [], error: null } }
    async createTask() { return { data: null, error: null } }
    async removeTask() { return { data: null, error: null } }
    async updateAsDone() { return { data: null, error: null } }

    // --- Profiles & Users ---

    async getMyProfile() {
        // We can keep this via Client or move to API /api/users/me
        // Keeping Client for Profile is often safer/faster context, but let's stick to user request.
        // Actually, getting OWN profile via auth session is safe on client.
        const { data: { session } } = await this.client.auth.getSession();
        if (!session) return { data: null, error: { message: 'No session' } };

        return this.client.from('profiles').select('*').eq('id', session.user.id).single();
    }

    async getAllProfiles() {
        return this.apiRequest('/users');
    }

    async updateProfileRole(userId: string, role: 'admin' | 'manager' | 'member') {
        // This assumes we have an endpoint or use client. Let's use Client for Admin mgmt to avoid complexity of Admin API protection right now.
        return this.client.from('profiles').update({ role }).eq('id', userId);
    }

    // --- Projects (API BASED) ---

    async getProjects() {
        return this.apiRequest('/projects');
    }

    async getProject(id: number) {
        return this.apiRequest(`/projects/${id}`);
    }

    async createProject(name: string, description: string) {
        return this.apiRequest('/projects', 'POST', { name, description });
    }

    async deleteProject(id: number) {
        return this.apiRequest(`/projects/${id}`, 'DELETE');
    }

    // --- Project Tasks (API BASED) ---

    async getProjectTasks(projectId: number) {
        return this.apiRequest(`/tasks?project_id=${projectId}`);
    }

    async createProjectTask(task: Partial<Database['public']['Tables']['tasks']['Insert']>) {
        return this.apiRequest('/tasks', 'POST', task);
    }

    async updateTaskStatus(taskId: number, status: string) {
        return this.apiRequest(`/tasks/${taskId}`, 'PUT', { status });
    }

    async updateTaskAssignment(taskId: number, assignedTo: string) {
        return this.apiRequest(`/tasks/${taskId}`, 'PUT', { assigned_to: assignedTo });
    }

    async deleteProjectTask(taskId: number) {
        return this.apiRequest(`/tasks/${taskId}`, 'DELETE');
    }

    // --- Task Comments (API BASED) ---

    async getTaskComments(taskId: number) {
        return this.apiRequest(`/tasks/${taskId}/comments`);
    }

    async addTaskComment(comment: { task_id: number; user_id: string; content: string; image_url?: string | null }) {
        // comment object has task_id, content, image_url
        // API expects body
        return this.apiRequest(`/tasks/${comment.task_id}/comments`, 'POST', comment);
    }

    async deleteTaskComment(commentId: number) {
        return this.apiRequest(`/comments/${commentId}`, 'DELETE');
    }

    // --- Project Members (API BASED) ---

    async getProjectMembers(projectId: number) {
        return this.apiRequest(`/projects/${projectId}/members`);
    }

    async addProjectMember(projectId: number, userId: string, role: string = 'member') {
        return this.apiRequest(`/projects/${projectId}/members`, 'POST', { project_id: projectId, user_id: userId, role });
    }

    async removeProjectMember(projectId: number, userId: string) {
        return this.apiRequest(`/projects/${projectId}/members`, 'DELETE', { project_id: projectId, user_id: userId });
    }

    getSupabaseClient() {
        return this.client;
    }
}
