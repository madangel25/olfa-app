-- Broaden discovery/near-me reads so users can appear during testing.
-- Keeps banned users hidden, but does not require is_verified at RLS level.
create policy "Authenticated can select non-banned profiles"
  on public.profiles for select
  using (
    auth.role() = 'authenticated'
    and banned_at is null
  );
