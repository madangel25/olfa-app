-- Admin audit trail for Olfa Command Center
-- Run this in the Supabase SQL Editor if you haven't already.

create table if not exists public.admin_logs (
  id bigserial primary key,
  admin_id uuid not null references auth.users(id) on delete cascade,
  admin_email text,
  action_type text not null,
  target_user_id uuid references auth.users(id) on delete set null,
  details text,
  created_at timestamptz not null default now()
);

comment on table public.admin_logs is 'Audit trail for admin/moderator actions: verification, role changes, flags, behavior score.';

-- Optional: RLS so only admins/mods can read; service role can write from backend.
-- For client-side logging with anon key, allow insert for authenticated users and select for admin/moderator roles (enforce in app or with RLS).
alter table public.admin_logs enable row level security;

create policy "Admins and moderators can read admin_logs"
  on public.admin_logs for select
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.role in ('admin', 'moderator')
    )
  );

create policy "Admins and moderators can insert admin_logs"
  on public.admin_logs for insert
  with check (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.role in ('admin', 'moderator')
    )
  );
