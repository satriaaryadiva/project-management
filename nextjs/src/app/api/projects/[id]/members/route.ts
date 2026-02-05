import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { Database } from '@/lib/types';

// GET Members of a Project
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const cookieStore = await cookies();
    const supabase = createServerClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() { return cookieStore.getAll() },
                setAll(cookiesToSet) {
                    try { cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) } catch { }
                },
            },
        }
    );

    const { data, error } = await supabase.from('project_members')
        .select('*, profiles(full_name, email)')
        .eq('project_id', parseInt(id));

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
}

// POST: Add Member
export async function POST(request: Request) {
    const body = await request.json();
    const cookieStore = await cookies();
    const supabase = createServerClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() { return cookieStore.getAll() },
                setAll(cookiesToSet) {
                    try { cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) } catch { }
                },
            },
        }
    );

 
    const { error } = await supabase.from('project_members').upsert(body, { onConflict: 'project_id,user_id', ignoreDuplicates: true });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
}

 
export async function DELETE(request: Request) {
    const body = await request.json();
    const cookieStore = await cookies();
    const supabase = createServerClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() { return cookieStore.getAll() },
                setAll(cookiesToSet) {
                    try { cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) } catch { }
                },
            },
        }
    );

    const { error } = await supabase.from('project_members')
        .delete()
        .match({ project_id: body.project_id, user_id: body.user_id });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
}
