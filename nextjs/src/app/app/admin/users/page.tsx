'use client';

import { useEffect, useState } from 'react';
import { createSPASassClientAuthenticated } from '@/lib/supabase/client';
import { Database } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type Profile = Database['public']['Tables']['profiles']['Row'];

export default function AdminUsersPage() {
    const [profiles, setProfiles] = useState<Profile[]>([]);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState<string | null>(null);

    useEffect(() => {
        loadProfiles();
    }, []);

    async function loadProfiles() {
        setLoading(true);
        try {
            const client = await createSPASassClientAuthenticated();
            const { data, error } = await client.getAllProfiles();
            if (error) throw error;
            setProfiles(data || []);
        } catch (error) {
            console.error('Error loading profiles:', error);
            alert('Failed to load profiles');
        } finally {
            setLoading(false);
        }
    }

    async function handleRoleChange(userId: string, newRole: 'admin' | 'manager' | 'member') {
        setUpdating(userId);
        try {
            const client = await createSPASassClientAuthenticated();
            const { error } = await client.updateProfileRole(userId, newRole);
            if (error) throw error;

            // Optimistic update
            setProfiles(profiles.map(p => p.id === userId ? { ...p, role: newRole } : p));
        } catch (error) {
            console.error('Error updating role:', error);
            alert('Failed to update role');
        } finally {
            setUpdating(null);
        }
    }

    return (
        <div className="container mx-auto p-6">
            <h1 className="text-3xl font-bold mb-6">User Management</h1>
            <Card>
                <CardHeader>
                    <CardTitle>All Users</CardTitle>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <p>Loading users...</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr>
                                        <th className="p-3 border-b">Name</th>
                                        <th className="p-3 border-b">Email</th>
                                        <th className="p-3 border-b">Role</th>
                                        <th className="p-3 border-b">Joined</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {profiles.map((profile) => (
                                        <tr key={profile.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                                            <td className="p-3 border-b font-medium">{profile.full_name || 'N/A'}</td>
                                            <td className="p-3 border-b text-gray-500">{profile.email}</td>
                                            <td className="p-3 border-b">
                                                <select
                                                    value={profile.role}
                                                    onChange={(e) => handleRoleChange(profile.id, e.target.value as any)}
                                                    className="p-1 border rounded bg-background"
                                                    disabled={updating === profile.id}
                                                >
                                                    <option value="member">Member</option>
                                                    <option value="manager">Manager</option>
                                                    <option value="admin">Admin</option>
                                                </select>
                                                {updating === profile.id && <span className="ml-2 text-xs text-blue-500">Saving...</span>}
                                            </td>
                                            <td className="p-3 border-b text-gray-500">
                                                {new Date(profile.created_at).toLocaleDateString()}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
