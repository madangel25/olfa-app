-- Profile visits: when a user opens another user's profile (for "Visited" badge in Discovery).
create table if not exists public.profile_visits (
  id uuid primary key default gen_random_uuid(),
  visitor_id uuid not null references public.profiles(id) on delete cascade,
  visited_id uuid not null references public.profiles(id) on delete cascade,
  visited_at timestamptz not null default now()
);

create index if not exists idx_profile_visits_visitor on public.profile_visits(visitor_id);
create index if not exists idx_profile_visits_visited on public.profile_visits(visited_id);

comment on table public.profile_visits is 'Records when a user views another profile; used for Visited badge in Discovery.';

alter table public.profile_visits enable row level security;

create policy "Users can insert own profile visits"
  on public.profile_visits for insert
  with check (visitor_id = auth.uid());

create policy "Users can view own profile visits"
  on public.profile_visits for select
  using (visitor_id = auth.uid());
