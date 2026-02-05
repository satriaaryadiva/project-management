'use client';

import { useEffect, useState } from 'react';
import { createSPASassClientAuthenticated } from '@/lib/supabase/client';
import { Database } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { User as UserIcon } from 'lucide-react';

type Profile = Database['public']['Tables']['profiles']['Row'];

export default function ManageMembersDialog({ projectId, currentMembers, onUpdate }: { projectId: number, currentMembers: Profile[], onUpdate: () => void }) {
    const [open, setOpen] = useState(false);
    const [allProfiles, setAllProfiles] = useState<Profile[]>([]);
    const [selectedUserId, setSelectedUserId] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (open) {
            loadProfiles();
        }
    }, [open]);

    async function loadProfiles() {
        const client = await createSPASassClientAuthenticated();
        const { data } = await client.getAllProfiles();

        setAllProfiles(data || []);
    }

    async function handleAddMember() {
        if (!selectedUserId) return;
        setLoading(true);
        try {
            const client = await createSPASassClientAuthenticated();
            const { error } = await client.addProjectMember(projectId, selectedUserId, 'member');
            if (error) {

                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                if ((error as any).code !== '23505') throw error;
            }
            setSelectedUserId('');
            onUpdate();
        } catch (error) {
            console.error(error);
            alert('Failed to add member');
        } finally {
            setLoading(false);
        }
    }

    async function handleRemoveMember(userId: string) {
        if (!confirm('Remove this member?')) return;
        try {
            const client = await createSPASassClientAuthenticated();
            const { error } = await client.removeProjectMember(projectId, userId);
            if (error) throw error;
            onUpdate();
        } catch (error) {
            console.error(error);
            alert('Failed to remove member');
        }
    }

    // Filter out users who are already members
    const availableProfiles = allProfiles.filter(p => !currentMembers.find(m => m.id === p.id));

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                    <UserIcon className="h-4 w-4 mr-2" />
                    Manage Members
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Project Members</DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                    <div className="flex gap-2">
                        <select
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                            value={selectedUserId}
                            onChange={e => setSelectedUserId(e.target.value)}
                        >
                            <option value="">Select user to add...</option>
                            {availableProfiles.map(p => (
                                <option key={p.id} value={p.id}>{p.full_name || p.email}</option>
                            ))}
                        </select>
                        <Button onClick={handleAddMember} disabled={!selectedUserId || loading}>Add</Button>
                    </div>

                    <div className="space-y-2 max-h-[200px] overflow-y-auto">
                        {currentMembers.length === 0 && <p className="text-sm text-gray-500">No members yet.</p>}
                        {currentMembers.map(m => (
                            <div key={m.id} className="flex justify-between items-center p-2 border rounded bg-gray-50 dark:bg-gray-900">
                                <div>
                                    <p className="text-sm font-medium">{m.full_name || 'No Name'}</p>
                                    <p className="text-xs text-gray-500">{m.email}</p>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-red-500 hover:text-red-700"
                                    onClick={() => handleRemoveMember(m.id)}
                                >
                                    Remove
                                </Button>
                            </div>
                        ))}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
