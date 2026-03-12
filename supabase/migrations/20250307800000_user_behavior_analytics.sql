-- VIP personality/behavior insights per conversation (viewer sees analyzed user's stats).
-- Drop if exists so a partial run with wrong schema is replaced.
drop table if exists public.user_behavior_analytics;

create table public.user_behavior_analytics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  viewer_id uuid not null references public.profiles(id) on delete cascade,
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  response_time_avg_seconds double precision,
  avg_word_count double precision,
  seriousness_score integer,
  response_speed_label text,
  engagement_label text,
  last_calculated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(viewer_id, user_id)
);

create index idx_user_behavior_analytics_viewer
  on public.user_behavior_analytics(viewer_id);
create index idx_user_behavior_analytics_user
  on public.user_behavior_analytics(user_id);

alter table public.user_behavior_analytics enable row level security;

create policy "Users can manage own analytics rows"
  on public.user_behavior_analytics for all
  using (viewer_id = auth.uid())
  with check (viewer_id = auth.uid());

comment on table public.user_behavior_analytics is 'VIP personality insights: response speed, engagement, seriousness score per partner.';
