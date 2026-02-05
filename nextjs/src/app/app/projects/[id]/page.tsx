'use client';

import { useEffect, useState, use, useCallback } from 'react';
import { createSPASassClientAuthenticated } from '@/lib/supabase/client';
import { Database } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Loader2, Calendar, User as UserIcon, Plus, Trash2 } from 'lucide-react';

import ManageMembersDialog from '@/components/project/ManageMembersDialog';
import TaskDetailDialog from '@/components/project/TaskDetailDialog';

type Project = Database['public']['Tables']['projects']['Row'] & {
    profiles: { full_name: string | null } | null
};

type Task = Database['public']['Tables']['tasks']['Row'] & {
    profiles: { full_name: string | null; email: string | null } | null
};

type Profile = Database['public']['Tables']['profiles']['Row'];

export default function ProjectDetailsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id: projectIdStr } = use(params);
    const projectId = parseInt(projectIdStr);

    const [project, setProject] = useState<Project | null>(null);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [members, setMembers] = useState<Profile[]>([]);
    const [loading, setLoading] = useState(true);
    const [userRole, setUserRole] = useState<string | null>(null);
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const client = await createSPASassClientAuthenticated();

            // Fetch User Role
            const { data: profile } = await client.getMyProfile();
            setUserRole(profile?.role || null);

            // Fetch Project
            const { data: projData, error: projError } = await client.getProject(projectId);
            if (projError) throw projError;
        
            setProject(projData);

         
            const { data: tasksData, error: tasksError } = await client.getProjectTasks(projectId);
            if (tasksError) throw tasksError;
               setTasks(tasksData || []);

            // Fetch Project Members (Use the relationship to get profiles)
            const { data: membersData, error: membersError } = await client.getProjectMembers(projectId);
            if (membersError) throw membersError;

            // Map project_members to profiles
            // @ts-expect-error - Data type mismatch
            const mappedMembers = membersData?.map(m => m.profiles).filter(Boolean) as Profile[];
            setMembers(mappedMembers || []);

        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setLoading(false);
        }
    }, [projectId]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    async function handleTaskUpdated() {
        await loadData();
    }

    const isManager = userRole === 'admin' || userRole === 'manager';

    async function updateTaskStatus(taskId: number, newStatus: 'todo' | 'in-progress' | 'done') {
        if (newStatus === 'done' && !isManager) {
            alert("Only Managers can complete tasks!");
            return;
        }

        // Optimistic update
        setTasks(tasks.map(t => t.id === taskId ? { ...t, status: newStatus } : t));

        try {
            const client = await createSPASassClientAuthenticated();
            await client.updateTaskStatus(taskId, newStatus);
        } catch (error) {
            console.error('Error updating task:', error);
            loadData(); // Revert
        }
    }

    async function handleDeleteTask(taskId: number) {
        if (!isManager) return;
        if (!confirm("Are you sure you want to delete this task?")) return;

        // Optimistic delete
        setTasks(tasks.filter(t => t.id !== taskId));

        try {
            const client = await createSPASassClientAuthenticated();
            await client.deleteProjectTask(taskId);
        } catch (error) {
            console.error('Error deleting task:', error);
            alert('Failed to delete task');
            loadData(); // Revert
        }
    }

    async function handleQuickAdd(title: string) {
        if (!isManager) return;
        try {
            const client = await createSPASassClientAuthenticated();
            const { error } = await client.createProjectTask({
                project_id: projectId,
                title: title,
                description: '',
                status: 'todo'
            });
            if (error) throw error;
            loadData();
        } catch (error) {
            console.error('Error creating task:', error);
            alert('Failed to create task');
        }
    }

    if (loading && !project) return <div className="p-6">Loading...</div>;
    if (!project) return <div className="p-6">Project not found</div>;

    const todoTasks = tasks.filter(t => t.status === 'todo');
    const progressTasks = tasks.filter(t => t.status === 'in-progress');
    const doneTasks = tasks.filter(t => t.status === 'done');

    return (
        <div className="container mx-auto p-6 h-[calc(100vh-4rem)] flex flex-col">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-3xl font-bold">{project.name}</h1>
                    <p className="text-gray-500">{project.description}</p>
                    <div className="mt-2 flex gap-2 items-center">
                        <Badge variant="outline">Role: {userRole || '...'}</Badge>
                        {!isManager && <span className="text-xs text-amber-600">(Task Management Restricted)</span>}
                    </div>
                </div>

                <div className="flex gap-2">
                    {isManager && (
                        <>
                            <ManageMembersDialog
                                projectId={projectId}
                                currentMembers={members}
                                onUpdate={loadData}
                            />
                            <CreateTaskDialog
                                projectId={projectId}
                                members={members}
                                onTaskCreated={handleTaskUpdated}
                            />
                        </>
                    )}
                </div>
            </div>

            <div className="flex-grow grid grid-cols-1 md:grid-cols-3 gap-6 overflow-hidden">
                <TaskColumn
                    title="To Do"
                    tasks={todoTasks}
                    status="todo"
                    onMove={updateTaskStatus}
                    onAdd={isManager ? handleQuickAdd : undefined}
                    onDelete={handleDeleteTask}
                    onClickTask={setSelectedTask}
                    color="bg-gray-100 dark:bg-gray-800"
                    isManager={isManager}
                />
                <TaskColumn
                    title="In Progress"
                    tasks={progressTasks}
                    status="in-progress"
                    onMove={updateTaskStatus}
                    onDelete={handleDeleteTask}
                    onClickTask={setSelectedTask}
                    color="bg-blue-50 dark:bg-blue-900/20"
                    isManager={isManager}
                />
                <TaskColumn
                    title="Done"
                    tasks={doneTasks}
                    status="done"
                    onMove={updateTaskStatus}
                    onDelete={handleDeleteTask}
                    onClickTask={setSelectedTask}
                    color="bg-green-50 dark:bg-green-900/20"
                    isManager={isManager}
                />
            </div>

            <TaskDetailDialog
                open={!!selectedTask}
                task={selectedTask}
                onClose={() => setSelectedTask(null)}
                onUpdate={loadData}
            />
        </div>
    );
}

function TaskColumn({ title, tasks, status, onMove, onAdd, onDelete, onClickTask, color, isManager }: {
    title: string,
    tasks: Task[],
    status: 'todo' | 'in-progress' | 'done',
    onMove: (id: number, status: 'todo' | 'in-progress' | 'done') => void,
    onAdd?: (title: string) => void,
    onDelete: (id: number) => void,
    onClickTask: (task: Task) => void,
    color: string,
    isManager: boolean
}) {
    const [quickTitle, setQuickTitle] = useState('');
    const [isAdding, setIsAdding] = useState(false);

    const handleQuickSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!quickTitle.trim() || !onAdd) return;
        setIsAdding(true);
        onAdd(quickTitle);
        setQuickTitle('');
        setIsAdding(false);
    };

    return (
        <div className={`flex flex-col h-full rounded-lg p-4 ${color}`}>
            <h2 className="font-bold mb-4 flex justify-between items-center">
                {title}
                <span className="bg-background px-2 py-0.5 rounded-full text-xs border">{tasks.length}</span>
            </h2>
            <div className="flex-grow overflow-y-auto space-y-3">
                {tasks.map(task => (
                    <Card key={task.id} className="cursor-pointer hover:shadow-md transition-shadow group relative" onClick={() => onClickTask(task)}>
                        <CardContent className="p-4">
                            <div className="flex justify-between items-start">
                                <h3 className="font-medium pr-6">{task.title}</h3>
                                {isManager && (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onDelete(task.id); }}
                                        className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity absolute top-2 right-2 p-1 rounded"
                                        title="Delete Task"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                )}
                            </div>

                            {task.description && <p className="text-sm text-gray-500 mt-1 line-clamp-2">{task.description}</p>}

                            <div className="mt-3 flex flex-wrap gap-2 text-xs text-gray-400">
                                <div className="flex items-center gap-1">
                                    <UserIcon className="w-3 h-3" />
                                    {task.profiles?.full_name || 'Unassigned'}
                                </div>
                                {task.deadline && (
                                    <div className="flex items-center gap-1 text-amber-600">
                                        <Calendar className="w-3 h-3" />
                                        {new Date(task.deadline).toLocaleDateString()}
                                    </div>
                                )}
                            </div>

                            <div className="mt-3 flex justify-between items-center">
                                <div className="flex gap-1 ml-auto">
                                    {status !== 'todo' && (
                                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={(e) => { e.stopPropagation(); onMove(task.id, 'todo'); }} title="Move to Todo">←</Button>
                                    )}
                                    {status !== 'in-progress' && (
                                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={(e) => { e.stopPropagation(); onMove(task.id, 'in-progress'); }} title="Move to In Progress">
                                            {status === 'todo' ? '→' : '←'}
                                        </Button>
                                    )}
                                    {status !== 'done' && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className={`h-6 w-6 p-0 ${!isManager ? 'opacity-30 cursor-not-allowed' : ''}`}
                                            onClick={(e) => { e.stopPropagation(); onMove(task.id, 'done'); }}
                                            title={!isManager ? "Only Managers can complete" : "Move to Done"}
                                        >
                                            →
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {onAdd && isManager && (
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <form onSubmit={handleQuickSubmit} className="flex gap-2">
                        <Input
                            value={quickTitle}
                            onChange={e => setQuickTitle(e.target.value)}
                            placeholder="+ Quick Task..."
                            className="h-8 text-sm bg-background"
                        />
                        <Button type="submit" size="sm" className="h-8 px-2" disabled={!quickTitle.trim() || isAdding}>Add</Button>
                    </form>
                </div>
            )}
        </div>
    );
}

function CreateTaskDialog({ projectId, members, onTaskCreated }: { projectId: number, members: Profile[], onTaskCreated: () => void }) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    // Form Fields
    const [title, setTitle] = useState('');
    const [desc, setDesc] = useState('');
    const [assignee, setAssignee] = useState('');
    const [deadline, setDeadline] = useState('');

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        try {
            const client = await createSPASassClientAuthenticated();
            const { error } = await client.createProjectTask({
                project_id: projectId,
                title: title,
                description: desc,
                status: 'todo',
                assigned_to: assignee || null, // Pass UUID or null
                deadline: deadline || null // Pass date string or null
            });

            if (error) throw error;
            setTitle('');
            setDesc('');
            setAssignee('');
            setDeadline('');
            setOpen(false);
            onTaskCreated();
        } catch (error) {
            console.error(error);
            alert('Failed to create task');
        } finally {
            setLoading(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    New Task
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Create New Task</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Task Title *</label>
                        <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Design Homepage" required />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">Description</label>
                        <Textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder="Optional details..." rows={3} />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Assign To</label>
                            <select
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                value={assignee}
                                onChange={e => setAssignee(e.target.value)}
                            >
                                <option value="">Unassigned</option>
                                <option disabled className="text-xs bg-gray-100 font-bold">-- Project Members --</option>
                                {members.length === 0 && <option disabled>No members found</option>}
                                {members.map(m => (
                                    <option key={m.id} value={m.id}>
                                        {m.full_name || m.email}
                                    </option>
                                ))}
                            </select>
                            <p className="text-[10px] text-gray-400">Manage members to see more people here.</p>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Deadline</label>
                            <Input
                                type="date"
                                value={deadline}
                                onChange={e => setDeadline(e.target.value)}
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button type="submit" disabled={loading}>
                            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Create Task'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
