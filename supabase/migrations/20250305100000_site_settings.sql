-- Site settings (singleton) for logo, home background, and hero text (EN/AR).
-- Run this in the Supabase SQL Editor or via supabase db push.

create table if not exists public.site_settings (
  id uuid primary key default gen_random_uuid(),
  logo_url text,
  home_background_url text,
  hero_heading_en text,
  hero_heading_ar text,
  hero_subheading_en text,
  hero_subheading_ar text,
  updated_at timestamptz not null default now()
);

comment on table public.site_settings is 'Single-row site config: logo, home background, hero text per locale.';

-- Ensure exactly one row (singleton).
insert into public.site_settings (id)
select gen_random_uuid()
where not exists (select 1 from public.site_settings limit 1);

alter table public.site_settings enable row level security;

-- Everyone can read site settings (for home page).
create policy "Public read site_settings"
  on public.site_settings for select
  using (true);

-- Only admins can update (enforced in app via AdminGuard; RLS allows any authenticated for simplicity, or restrict by profile.role).
create policy "Admins can update site_settings"
  on public.site_settings for update
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.role = 'admin'
    )
  );

create policy "Admins can insert site_settings"
  on public.site_settings for insert
  with check (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.role = 'admin'
    )
  );

-- Storage bucket for site assets (logo, home background).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'site-assets',
  'site-assets',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']
)
on conflict (id) do update set
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'];

-- Allow public read for site-assets (bucket is public; optional explicit policy).
create policy "Public read site-assets"
  on storage.objects for select
  using (bucket_id = 'site-assets');

-- Only admins can upload/update/delete in site-assets.
create policy "Admins upload site-assets"
  on storage.objects for insert
  with check (
    bucket_id = 'site-assets'
    and exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.role = 'admin'
    )
  );

create policy "Admins update site-assets"
  on storage.objects for update
  using (
    bucket_id = 'site-assets'
    and exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.role = 'admin'
    )
  );

create policy "Admins delete site-assets"
  on storage.objects for delete
  using (
    bucket_id = 'site-assets'
    and exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.role = 'admin'
    )
  );
