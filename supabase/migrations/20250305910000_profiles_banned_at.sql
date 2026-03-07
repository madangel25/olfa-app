-- Allow admins to ban users (banned_at set) and to delete profiles.
alter table public.profiles
  add column if not exists banned_at timestamptz default null;

comment on column public.profiles.banned_at is 'When set, user is banned; login/dashboard should redirect or deny.';

create policy "Admins and moderators can delete profiles"
  on public.profiles for delete
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
      and p.role in ('admin', 'moderator')
    )
  );
