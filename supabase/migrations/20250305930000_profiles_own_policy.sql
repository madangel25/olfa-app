-- Allow users to read, insert, and update their own profile (id = auth.uid()).
-- Fixes 403 on profiles select/insert when RLS only had admin policies.
-- No subquery on profiles, so no RLS recursion.

alter table public.profiles enable row level security;

create policy "Users can select own profile"
  on public.profiles for select
  using (id = auth.uid());

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (id = auth.uid());

create policy "Users can update own profile"
  on public.profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());
