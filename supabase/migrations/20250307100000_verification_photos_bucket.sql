-- Verification photos bucket: private; users upload to their own folder; admins can read for review.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'verification-photos',
  'verification-photos',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = false,
  file_size_limit = 5242880,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

-- Users can upload only to their own folder: verification-photos/{auth.uid()}/
create policy "Users upload own verification photos"
  on storage.objects for insert
  with check (
    bucket_id = 'verification-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Admins can list and read all verification photos (for dashboard review and signed URLs).
create policy "Admins read verification photos"
  on storage.objects for select
  using (
    bucket_id = 'verification-photos'
    and exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.role = 'admin'
    )
  );
