-- Add landing feature image URL to site_settings (1/3 split on landing page).
-- Run in Supabase SQL Editor or via supabase db push.

alter table public.site_settings
  add column if not exists landing_feature_image_url text;

comment on column public.site_settings.landing_feature_image_url is 'Landing page feature image (left 1/3); updatable from Admin Dashboard.';
