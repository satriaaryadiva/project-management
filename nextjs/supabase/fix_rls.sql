-- PHASE 4 FIX: Enable Member Management for Managers/Admins

-- 1. Unblock Project Member Management (Fixes "violates row-level security policy")
drop policy if exists "Managers can manage project members" on project_members;
drop policy if exists "Enable read access for all users" on project_members; 
 
create policy "Enable read access for all users"
  on project_members for select
  using ( auth.role() = 'authenticated' );

 
create policy "Managers can manage project members"
  on project_members
  for all
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and profiles.role in ('admin', 'manager')
    )
  );

-- 2. Ensure Tasks are also manageable (Just in case)
drop policy if exists "Managers can manage tasks" on tasks;
create policy "Managers can manage tasks"
  on tasks
  for all
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and profiles.role in ('admin', 'manager')
    )
  );
