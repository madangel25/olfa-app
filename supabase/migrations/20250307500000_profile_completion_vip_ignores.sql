-- profile_completion: 0-100, used by discover-near-me to show only "complete" profiles.
alter table public.profiles
  add column if not exists profile_completion integer not null default 0;
comment on column public.profiles.profile_completion is 'Profile completeness 0-100; 100 required for discover-near-me.';

-- is_vip: paid membership; admin can toggle; VIP cards get gold border.
alter table public.profiles
  add column if not exists is_vip boolean not null default false;
comment on column public.profiles.is_vip is 'VIP/paid membership; toggled by admin.';

-- quiz_answers: store onboarding quiz for compatibility scoring (if not already present).
alter table public.profiles
  add column if not exists quiz_answers jsonb default null;
comment on column public.profiles.quiz_answers is 'Onboarding quiz answers by category; used for compatibility %.';

-- ignores: user can "ignore" another; dimmed/hidden in discover-near-me.
create table if not exists public.ignores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  ignored_user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(user_id, ignored_user_id)
);
create index if not exists idx_ignores_user on public.ignores(user_id);
create index if not exists idx_ignores_ignored on public.ignores(ignored_user_id);
comment on table public.ignores is 'User ignore list; ignored users are dimmed in discover-near-me.';

alter table public.ignores enable row level security;

create policy "Users can manage own ignores"
  on public.ignores for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Backfill profile_completion: set 100 where key fields are filled (simplified rule).
update public.profiles
set profile_completion = 100
where is_verified = true
  and full_name is not null and trim(full_name) <> ''
  and gender is not null and trim(gender) <> ''
  and age is not null and age > 0
  and country is not null and trim(country) <> ''
  and city is not null and trim(city) <> ''
  and photo_urls is not null and jsonb_array_length(photo_urls) > 0
  and (profile_completion is null or profile_completion < 100);
