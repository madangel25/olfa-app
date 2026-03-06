-- Add pledge document text (EN/AR) to site_settings.
-- Run in Supabase SQL Editor or via supabase db push.

alter table public.site_settings
  add column if not exists pledge_text_en text;

alter table public.site_settings
  add column if not exists pledge_text_ar text;

comment on column public.site_settings.pledge_text_en is 'Ethical pledge document in English (shown on onboarding pledge page).';
comment on column public.site_settings.pledge_text_ar is 'Ethical pledge document in Arabic (تعهد الجدية).';
