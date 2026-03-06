-- Allow admins and moderators to update verification fields on profiles.
-- Run if your profiles table has RLS enabled and updates from the admin dashboard were failing.

alter table public.profiles enable row level security;

-- Allow admins/moderators to update is_verified and verification_submitted on any profile.
create policy "Admins and moderators can update verification on profiles"
  on public.profiles for update
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
      and p.role in ('admin', 'moderator')
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
      and p.role in ('admin', 'moderator')
    )
  );

-- If profiles already has a "users can update own row" policy, this adds the admin one.
-- If you get "policy already exists" for enable row level security, skip the alter and just create the policy.
