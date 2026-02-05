'use client';

import { useEffect, useState } from 'react';
import { createSPASassClientAuthenticated } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';

type ProjectSummary = {
    id: number;
    name: string;
    totalTasks: number;
    completedTasks: number;
    progress: number;
};

export default function DashboardPage() {
    const [summaries, setSummaries] = useState<ProjectSummary[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadDashboard();
    }, []);

    async function loadDashboard() {
        setLoading(true);
        try {
            const client = await createSPASassClientAuthenticated();

            // Get Projects
            const { data: projects, error: projError } = await client.getProjects();
            if (projError) throw projError;

            const summariesData: ProjectSummary[] = [];

            // For each project, get task stats
            // Note: This is N+1 query problem, acceptable for small scale MVP.
            // Ideally, we create a Postgres View or RPC for this.
            for (const project of projects || []) {
                const { data: tasks } = await client.getProjectTasks(project.id);
                const total = tasks?.length || 0;
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const completed = tasks?.filter((t: any) => t.status === 'done').length || 0;

                summariesData.push({
                    id: project.id,
                    name: project.name,
                    totalTasks: total,
                    completedTasks: completed,
                    progress: total > 0 ? Math.round((completed / total) * 100) : 0
                });
            }

            setSummaries(summariesData);

        } catch (error) {
            console.error('Error loading dashboard:', error);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="container mx-auto p-6">
            <h1 className="text-3xl font-bold mb-6">Dashboard</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Total Projects</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{summaries.length}</div>
                    </CardContent>
                </Card>
                {/* Add more high-level stats here if needed */}
            </div>

            <h2 className="text-xl font-bold mb-4">Project Progress</h2>
            {loading ? (
                <div>Loading...</div>
            ) : summaries.length === 0 ? (
                <div className="text-muted-foreground">No active projects.</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {summaries.map((summary) => (
                        <Link key={summary.id} href={`/app/projects/${summary.id}`}>
                            <Card className="hover:shadow-md transition-shadow cursor-pointer">
                                <CardHeader>
                                    <CardTitle className="flex justify-between">
                                        {summary.name}
                                        <span className="text-sm text-muted-foreground">{summary.progress}%</span>
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-blue-500 transition-all duration-500"
                                            style={{ width: `${summary.progress}%` }}
                                        />
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-2">
                                        {summary.completedTasks} / {summary.totalTasks} tasks completed
                                    </p>
                                </CardContent>
                            </Card>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}