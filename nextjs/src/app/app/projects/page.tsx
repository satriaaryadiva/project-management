'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createSPASassClientAuthenticated } from '@/lib/supabase/client';
import { Database } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea'; // Assuming this exists, if not fallback to input

type Project = Database['public']['Tables']['projects']['Row'] & {
    profiles: { full_name: string | null } | null
};

export default function ProjectsPage() {
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [userRole, setUserRole] = useState<string | null>(null);

    // Form state
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        loadProjects();
    }, []);

    async function loadProjects() {
        setLoading(true);
        try {
            const client = await createSPASassClientAuthenticated();

            // Fetch User Role
            const { data: profile, error: profileError } = await client.getMyProfile();
            if (profileError) {
                console.warn("Could not fetch profile:", profileError);
                setUserRole(null);
            } else {
                setUserRole(profile?.role || null);
            }

            const { data } = await client.getProjects();
          
            setProjects(data || []);
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setLoading(false);
        }
    }

    async function handleFixProfile() {
        try {
            const client = await createSPASassClientAuthenticated();
            const { data: { user } } = await client.getSupabaseClient().auth.getUser();
            if (!user) return;

            // Try to insert profile if it's missing
            const { error } = await client.getSupabaseClient().from('profiles').upsert({
                id: user.id,
                email: user.email,
                role: 'admin',
                full_name: user.user_metadata?.full_name || 'Admin User'
            });

            if (error) throw error;

            alert("Profile fixed and Role set to Admin! Reloading...");
            window.location.reload();
        } catch (error: unknown) {
            const msg = error instanceof Error ? error.message : String(error);
            alert("Failed to fix profile: " + msg);
        }
    }

    async function handleBecomeAdmin() {
        try {
            const client = await createSPASassClientAuthenticated();
            const { data: { user } } = await client.getSupabaseClient().auth.getUser();
            if (!user) return;

            const { error } = await client.updateProfileRole(user.id, 'admin');
            if (error) throw error;

            alert("Role updated to Admin! Reloading...");
            window.location.reload();
        } catch (error: unknown) {
            const msg = error instanceof Error ? error.message : String(error);
            alert("Failed to update role: " + msg);
        }
    }

    async function handleCreateProject(e: React.FormEvent) {
        e.preventDefault();
        setSubmitting(true);
        try {
            const client = await createSPASassClientAuthenticated();
            const { error } = await client.createProject(name, description);
            if (error) throw error;

            setIsDialogOpen(false);
            setName('');
            setDescription('');
            loadProjects(); // Reload list
        } catch (error: unknown) {
            console.error('Error creating project:', error);
            // Show detailed error message
            const msg = error instanceof Error ? error.message : JSON.stringify(error);
            alert(`Failed to create project: ${msg}`);
        } finally {
            setSubmitting(false);
        }
    }

    // Debugging helper
    console.log("Current projects:", projects);

    return (
        <div className="container mx-auto p-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-3xl font-bold">Projects</h1>
                    <div className="flex gap-2 items-center text-sm text-gray-500">
                        <span>Current Role: <span className="font-mono font-bold">{userRole || 'Missing/None'}</span></span>

                        {userRole === 'member' && (
                            <Button variant="outline" size="sm" onClick={handleBecomeAdmin} className="h-6 text-xs text-blue-500">
                                Promote to Admin
                            </Button>
                        )}
                        {!userRole && (
                            <Button variant="destructive" size="sm" onClick={handleFixProfile} className="h-6 text-xs">
                                Fix Missing Profile (Force Admin)
                            </Button>
                        )}
                    </div>
                </div>
                {(userRole === 'admin' || userRole === 'manager') && (
                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                        <DialogTrigger asChild>
                            <Button>New Project</Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Create New Project</DialogTitle>
                                <DialogDescription>
                                    Create a new project to start managing tasks.
                                </DialogDescription>
                            </DialogHeader>
                            <form onSubmit={handleCreateProject}>
                                <div className="space-y-4 py-4">
                                    <div className="space-y-2">
                                        <label htmlFor="name" className="text-sm font-medium">Project Name</label>
                                        <Input id="name" value={name} onChange={e => setName(e.target.value)} required placeholder="Website Redesign" />
                                    </div>
                                    <div className="space-y-2">
                                        <label htmlFor="description" className="text-sm font-medium">Description</label>
                                        <Textarea id="description" value={description} onChange={e => setDescription(e.target.value)} placeholder="Redesigning the company website..." />
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button type="submit" disabled={submitting}>
                                        {submitting ? 'Creating...' : 'Create Project'}
                                    </Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>
                )}
            </div>

            {loading ? (
                <div>Loading projects...</div>
            ) : projects.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                    No projects found. Create one to get started!
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {projects.map((project) => (
                        <Card key={project.id} className="flex flex-col">
                            <CardHeader>
                                <CardTitle>{project.name}</CardTitle>
                                <CardDescription>Created by {project.profiles?.full_name || 'Unknown'}</CardDescription>
                            </CardHeader>
                            <CardContent className="flex-grow">
                                <p className="text-sm text-gray-600 line-clamp-3">{project.description}</p>
                            </CardContent>
                            <CardFooter>
                                <Link href={`/app/projects/${project.id}`} className="w-full">
                                    <Button variant="outline" className="w-full">View Board</Button>
                                </Link>
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
