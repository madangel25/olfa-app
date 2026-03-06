-- Theme settings for site (male/female preferred colors).
alter table public.site_settings
  add column if not exists theme_male text default 'blue';

alter table public.site_settings
  add column if not exists theme_female text default 'pink-gold';

comment on column public.site_settings.theme_male is 'Preferred theme color for male profiles: blue, slate, etc.';
comment on column public.site_settings.theme_female is 'Preferred theme color for female profiles: pink-gold, rose, etc.';

-- Online presence: when the user was last active (updated by app).
alter table public.profiles
  add column if not exists last_seen_at timestamptz default now();

comment on column public.profiles.last_seen_at is 'Last activity timestamp; used to show online status in Discovery.';

-- Likes: who liked whom. status can be 'liked' for simplicity (or extend later).
create table if not exists public.likes (
  id uuid primary key default gen_random_uuid(),
  from_user_id uuid not null references public.profiles(id) on delete cascade,
  to_user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(from_user_id, to_user_id)
);

create index if not exists idx_likes_from on public.likes(from_user_id);
create index if not exists idx_likes_to on public.likes(to_user_id);

comment on table public.likes is 'User likes for matching; mutual like = match.';

alter table public.likes enable row level security;

-- Users can insert their own likes (from_user_id = auth.uid()).
create policy "Users can insert own likes"
  on public.likes for insert
  with check (from_user_id = auth.uid());

-- Users can see likes where they are sender or receiver.
create policy "Users can view relevant likes"
  on public.likes for select
  using (from_user_id = auth.uid() or to_user_id = auth.uid());

-- Users can delete their own likes (unlike).
create policy "Users can delete own likes"
  on public.likes for delete
  using (from_user_id = auth.uid());
