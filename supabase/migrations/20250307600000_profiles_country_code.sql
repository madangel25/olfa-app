-- 2-letter ISO country code (e.g. SA, EG, AE) for filtering and flags.
alter table public.profiles
  add column if not exists country_code text default null;

comment on column public.profiles.country_code is '2-letter ISO country code for discover-near-me filter and flag display.';
