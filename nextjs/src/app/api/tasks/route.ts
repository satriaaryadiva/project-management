import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { Database } from '@/lib/types';

export async function GET(request: Request) {
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

    // Get URL Params for optional filtering
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('project_id');

    let query = supabase.from('tasks').select('*, profiles!tasks_assigned_to_fkey(full_name)');
    if (projectId) {
        query = query.eq('project_id', parseInt(projectId));
    }

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
}

// POST endpoint to demonstrate input validation
export async function POST(request: Request) {
    const body = await request.json();

    // 1. Input Validation
    if (!body.title || typeof body.title !== 'string' || body.title.length < 3) {
        return NextResponse.json({ error: 'Invalid Title: Must be string > 3 chars' }, { status: 400 });
    }
    if (!body.project_id) {
        return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }

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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await supabase.from('tasks').insert({
        title: body.title,
        description: body.description || '',
        project_id: body.project_id,
        status: 'todo'
    } as any).select().single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data, { status: 201 });
}
