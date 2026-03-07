-- Allow admins and moderators to read all profiles (required for Admin Users table).
create policy "Admins and moderators can select all profiles"
  on public.profiles for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
      and p.role in ('admin', 'moderator')
    )
  );
