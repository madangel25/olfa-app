-- Peer-review ratings: one rating per (from_user, to_user).
-- Rating only allowed when users have interacted (e.g. mutual like); enforced in API.
create table if not exists public.ratings (
  id uuid primary key default gen_random_uuid(),
  from_user_id uuid not null references public.profiles(id) on delete cascade,
  to_user_id uuid not null references public.profiles(id) on delete cascade,
  rating_value smallint not null check (rating_value >= 1 and rating_value <= 5),
  created_at timestamptz not null default now(),
  unique(from_user_id, to_user_id)
);

create index if not exists idx_ratings_to on public.ratings(to_user_id);
create index if not exists idx_ratings_from on public.ratings(from_user_id);

comment on table public.ratings is 'Peer ratings (1-5 stars). One rating per pair. Interaction check done in API.';

alter table public.ratings enable row level security;

-- Users can insert a rating where they are the sender.
create policy "Users can insert own ratings"
  on public.ratings for insert
  with check (from_user_id = auth.uid());

-- Users can read ratings they gave (from_user) or ratings they received (to_user).
create policy "Users can view own ratings given or received"
  on public.ratings for select
  using (from_user_id = auth.uid() or to_user_id = auth.uid());

-- Users can update/delete only ratings they gave (optional: allow update to change score).
create policy "Users can update own ratings"
  on public.ratings for update
  using (from_user_id = auth.uid());

create policy "Users can delete own ratings"
  on public.ratings for delete
  using (from_user_id = auth.uid());

-- Public aggregate: anyone can get average rating for a profile (for display).
create or replace function public.get_profile_rating(p_to_user_id uuid)
returns table(avg_rating numeric, count_ratings bigint)
language sql
security definer
set search_path = public
as $$
  select round(avg(rating_value)::numeric, 2), count(*)::bigint
  from public.ratings
  where to_user_id = p_to_user_id;
$$;

comment on function public.get_profile_rating(uuid) is 'Returns (average rating 1-5, count) for a user; used for community rating display.';

grant execute on function public.get_profile_rating(uuid) to anon;
grant execute on function public.get_profile_rating(uuid) to authenticated;
