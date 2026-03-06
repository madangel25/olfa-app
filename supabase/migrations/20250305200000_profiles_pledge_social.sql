-- Add ethical pledge and social links to profiles.
-- Run in Supabase SQL Editor or via supabase db push.

alter table public.profiles
  add column if not exists pledge_accepted boolean not null default false;

alter table public.profiles
  add column if not exists social_links jsonb default null;

comment on column public.profiles.pledge_accepted is 'User has accepted the ethical pledge (onboarding step).';
comment on column public.profiles.social_links is 'Optional social profile URLs, e.g. { "facebook": "...", "linkedin": "..." } for verification only.';
