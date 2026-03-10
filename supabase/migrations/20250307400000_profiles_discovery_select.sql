-- Allow authenticated users to read verified, non-banned profiles for discovery.
-- Required so /dashboard/discovery can list other users (opposite gender, etc.).
create policy "Users can select verified profiles for discovery"
  on public.profiles for select
  using (
    auth.role() = 'authenticated'
    and is_verified = true
    and (banned_at is null)
  );
