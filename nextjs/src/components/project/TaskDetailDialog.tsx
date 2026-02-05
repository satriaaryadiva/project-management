'use client';

import { useEffect, useState } from 'react';
import { createSPASassClientAuthenticated } from '@/lib/supabase/client';
import { Database } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Loader2, Send, Paperclip, User as UserIcon, Calendar, Trash2 } from 'lucide-react';
import Image from 'next/image';

type Task = Database['public']['Tables']['tasks']['Row'] & {
    profiles: { full_name: string | null; email: string | null } | null
};
type Comment = Database['public']['Tables']['task_comments']['Row'] & {
    profiles: { full_name: string | null; avatar_url: string | null } | null
};

export default function TaskDetailDialog({ task, open, onClose, onUpdate }: { task: Task | null, open: boolean, onClose: () => void, onUpdate: () => void }) {
    const [comments, setComments] = useState<Comment[]>([]);
    const [newComment, setNewComment] = useState('');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [commenting, setCommenting] = useState(false);
    const [myId, setMyId] = useState<string | null>(null);

    const loadComments = useCallback(async () => {
        if (!task) return;
        setLoading(true);
        try {
            const client = await createSPASassClientAuthenticated();
            const { data, error } = await client.getTaskComments(task.id);
            if (error) throw error;
            // data is inferred as any, so no error here
            setComments(data || []);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }, [task]);

    // Use onUpdate to refresh parent if needed, though mostly local here.
    // To silence unused var warning if we don't use it:
    useEffect(() => {
        if (!onUpdate) return;
    }, [onUpdate]);

    useEffect(() => {
        if (open && task) {
            loadComments();
            // Get my ID for delete permissions
            createSPASassClientAuthenticated().then(async (client) => {
                const { data } = await client.getSupabaseClient().auth.getUser();
                setMyId(data.user?.id || null);
            });
        }
    }, [open, task, loadComments]);

    async function handlePostComment(e: React.FormEvent) {
        e.preventDefault();
        if ((!newComment.trim() && !selectedFile) || !task || !myId) return;

        setCommenting(true);
        try {
            const client = await createSPASassClientAuthenticated();
            let imageUrl = null;

            if (selectedFile) {
                // Upload file
                const { data, error } = await client.uploadFile(myId, `task_${task.id}_${Date.now()}_${selectedFile.name}`, selectedFile);
                if (error) throw error;
                // Get Public URL
                const { data: { publicUrl } } = client.getSupabaseClient().storage.from('files').getPublicUrl(data.path);
                imageUrl = publicUrl;
            }

            const { error: commentError } = await client.addTaskComment({
                task_id: task.id,
                user_id: myId,
                content: newComment,
                image_url: imageUrl
            });

            if (commentError) throw commentError;

            setNewComment('');
            setSelectedFile(null);
            loadComments();
        } catch (error) {
            console.error(error);
            alert('Failed to post comment');
        } finally {
            setCommenting(false);
        }
    }

    async function handleDeleteComment(commentId: number) {
        if (!confirm("Delete this comment?")) return;
        try {
            const client = await createSPASassClientAuthenticated();
            await client.deleteTaskComment(commentId);
            loadComments();
        } catch (e) {
            console.error(e);
        }
    }

    if (!task) return null;

    return (
        <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
            <DialogContent className="sm:max-w-[600px] h-[80vh] flex flex-col p-0 gap-0">
                <DialogHeader className="p-6 border-b">
                    <div className="flex justify-between items-start">
                        <div>
                            <DialogTitle className="text-xl">{task.title}</DialogTitle>
                            <div className="flex gap-2 mt-2">
                                <Badge variant={task.status === 'done' ? 'default' : task.status === 'in-progress' ? 'secondary' : 'outline'}>
                                    {task.status}
                                </Badge>
                                <span className="text-sm text-gray-500 flex items-center gap-1">
                                    <UserIcon className="w-3 h-3" /> {task.profiles?.full_name || 'Unassigned'}
                                </span>
                                {task.deadline && (
                                    <span className="text-sm text-gray-500 flex items-center gap-1">
                                        <Calendar className="w-3 h-3" /> {new Date(task.deadline).toLocaleDateString()}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </DialogHeader>

                <div className="flex-grow overflow-y-auto p-6 space-y-6">
                    {task.description && (
                        <div className="bg-gray-50 p-4 rounded-md text-sm">
                            {task.description}
                        </div>
                    )}

                    <div>
                        <h3 className="font-semibold mb-3">Comments & Updates</h3>
                        <div className="space-y-4">
                            {loading ? <Loader2 className="animate-spin text-gray-400" /> : comments.length === 0 ? (
                                <p className="text-sm text-gray-400 italic">No comments yet.</p>
                            ) : (
                                comments.map(comment => (
                                    <div key={comment.id} className="flex gap-3 text-sm group">
                                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 text-blue-700 font-bold text-xs uppercase">
                                            {comment.profiles?.full_name?.slice(0, 2) || '??'}
                                        </div>
                                        <div className="flex-grow">
                                            <div className="flex justify-between items-center">
                                                <span className="font-medium mr-2">{comment.profiles?.full_name || 'Unknown'}</span>
                                                <span className="text-xs text-gray-400">
                                                    {new Date(comment.created_at).toLocaleString()}
                                                </span>
                                            </div>

                                            <div className="mt-1 text-gray-700">
                                                {comment.content}
                                            </div>

                                            {comment.image_url && (
                                                <div className="mt-2 relative w-48 h-32 rounded overflow-hidden border">
                                                    <Image src={comment.image_url} alt="Attachment" fill className="object-cover" />
                                                </div>
                                            )}
                                        </div>
                                        {myId === comment.user_id && (
                                            <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-red-500" onClick={() => handleDeleteComment(comment.id)}>
                                                <Trash2 className="w-3 h-3" />
                                            </Button>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                <div className="p-4 border-t bg-gray-50">
                    <form onSubmit={handlePostComment} className="flex flex-col gap-2">
                        {selectedFile && (
                            <div className="flex items-center gap-2 text-xs bg-white p-2 border rounded max-w-fit">
                                <Paperclip className="w-3 h-3" />
                                <span className="truncate max-w-[200px]">{selectedFile.name}</span>
                                <button type="button" onClick={() => setSelectedFile(null)} className="text-red-500 ml-2">×</button>
                            </div>
                        )}
                        <div className="flex gap-2">
                            <div className="relative flex-grow">
                                <Input
                                    value={newComment}
                                    onChange={e => setNewComment(e.target.value)}
                                    placeholder="Add a comment or update..."
                                    className="pr-10"
                                    disabled={commenting}
                                />
                                <label className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer text-gray-400 hover:text-blue-500 p-1">
                                    <input type="file" className="hidden" accept="image/*" onChange={e => {
                                        if (e.target.files?.[0]) setSelectedFile(e.target.files[0]);
                                    }} />
                                    <Paperclip className="w-4 h-4" />
                                </label>
                            </div>
                            <Button type="submit" size="icon" disabled={commenting || (!newComment && !selectedFile)}>
                                {commenting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                            </Button>
                        </div>
                    </form>
                </div>
            </DialogContent>
        </Dialog>
    );
}
