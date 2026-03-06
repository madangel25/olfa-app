-- Extended profile fields for Profile Management (dashboard/profile).
-- Run in Supabase SQL Editor or via supabase db push.

alter table public.profiles
  add column if not exists phone text default null;

alter table public.profiles
  add column if not exists phone_verified boolean not null default false;

alter table public.profiles
  add column if not exists nationality text default null;

alter table public.profiles
  add column if not exists age integer default null;

alter table public.profiles
  add column if not exists marital_status text default null;

alter table public.profiles
  add column if not exists height_cm integer default null;

alter table public.profiles
  add column if not exists weight_kg integer default null;

alter table public.profiles
  add column if not exists skin_tone text default null;

alter table public.profiles
  add column if not exists smoking_status text default null;

alter table public.profiles
  add column if not exists religious_commitment text default null;

alter table public.profiles
  add column if not exists desire_children text default null;

alter table public.profiles
  add column if not exists job_title text default null;

alter table public.profiles
  add column if not exists education_level text default null;

alter table public.profiles
  add column if not exists country text default null;

alter table public.profiles
  add column if not exists city text default null;

alter table public.profiles
  add column if not exists about_me text default null;

alter table public.profiles
  add column if not exists ideal_partner text default null;

alter table public.profiles
  add column if not exists photo_urls jsonb default '[]'::jsonb;

alter table public.profiles
  add column if not exists primary_photo_index integer not null default 0;

alter table public.profiles
  add column if not exists photo_privacy_blur boolean not null default false;

comment on column public.profiles.phone is 'Phone number for OTP verification.';
comment on column public.profiles.photo_urls is 'Array of public URLs for user photos (up to 5).';
comment on column public.profiles.photo_privacy_blur is 'When true, blur photos for non-matches.';

-- Storage bucket for user profile assets (create if not exists via Dashboard or here).
-- insert into storage.buckets (id, name, public) values ('user-assets', 'user-assets', true)
-- on conflict (id) do nothing;
-- Policy: users can upload/update/delete only their own folder (path = user_id/*).
-- create policy "Users can manage own assets"
--   on storage.objects for all
--   using (bucket_id = 'user-assets' and (storage.foldername(name))[1] = auth.uid()::text)
--   with check (bucket_id = 'user-assets' and (storage.foldername(name))[1] = auth.uid()::text);
