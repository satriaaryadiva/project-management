# Project Management System (BasicSass)

A comprehensive Project Management application built with **Next.js 15 (App Router)** and **Supabase**.

## Features

-   **Role-Based Access Control (RBAC)**:
    -   **Admin**: Full access (Manage Users, all Projects/Tasks).
    -   **Manager**: Create Projects, Assign Members, Manage Tasks (Create, Delete, Complete).
    -   **Member**: View Projects, Update Task Progress, Post Comments.
-   **Project Management**: Create projects, view summaries, track progress.
-   **Task Board**: Kanban-style or List view for tasks.
-   **Task Details**: Comments, Image Attachments, Subtasks.
-   **API**: JSON-based API endpoints for integration.

## Architecture

-   **Frontend**: Next.js 15 (React Server Components + Client Components), TailwindCSS, Shadcn UI.
-   **Backend**: Supabase (PostgreSQL, Auth, Storage, Realtime).
-   **Security**: Row Level Security (RLS) policies enforce data access at the database level.
-   **State/Data**: Server Actions and Supabase Client for fetching data.

## Database Structure

### Tables
1.  **profiles**: Extends auth.users with `full_name`, `role` (admin/manager/member).
2.  **projects**: Stores project info (`name`, `description`).
3.  **tasks**: detailed task info (`title`, `status`, `deadline`, `assigned_to`, `ordering`).
4.  **task_comments**: Comments and attachments for tasks.
5.  **project_members**: Many-to-Many relationship between Projects and Users.

### Relationships
-   `projects` -> `created_by` (profiles)
-   `tasks` -> `project_id` (projects)
-   `tasks` -> `assigned_to` (profiles)
-   `task_comments` -> `task_id` (tasks)
-   `project_members` -> `project_id` & `user_id`

## Installation & Run

1.  **Clone the repository**:
    ```bash
    git clone <repository-url>
    cd <project-folder>
    ```

2.  **Install Dependencies**:
    ```bash
    npm install
    ```

3.  **Environment Setup**:
    Create `.env.local` and add your Supabase credentials:
    ```env
    NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
    NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_key
    ```
    *Also update `next.config.ts` if using Supabase Storage for images.*

4.  **Run Development Server**:
    ```bash
    npm run dev
    ```
    Open [http://localhost:3000](http://localhost:3000).

## API Endpoints

The application provides several JSON-based API endpoints:

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/api/health` | GET | Check system health (Public). |
| `/api/projects` | GET | List all projects. |
| `/api/projects/[id]` | GET | Get details of a specific project. |
| `/api/tasks` | GET | List tasks (optional `?project_id=1`). |
| `/api/tasks` | POST | Create a new task (Validation included). |
| `/api/users` | GET | List all registered users (profiles). |

## Security & Validation
-   **Input Validation**: Forms use standard HTML5 validation and React state checks. API endpoints validate JSON body.
-   **Sanitization**: All database queries use parameterized inputs via `supabase-js` to prevent SQL Injection.
-   **XSS Protection**: React automatically escapes content rendered in JSX.
