-- Banned words for chat moderation (Option B: silent flag).
create table if not exists public.banned_words (
  id uuid primary key default gen_random_uuid(),
  word text not null unique,
  created_at timestamptz not null default now()
);

create index if not exists idx_banned_words_word on public.banned_words(lower(word));
alter table public.banned_words enable row level security;

-- Only admins/service can manage; all authenticated can read for client-side check.
create policy "Authenticated can read banned words"
  on public.banned_words for select
  using (auth.role() = 'authenticated');

create policy "Admins can manage banned words"
  on public.banned_words for all
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  )
  with check (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- Flag on messages for admin review (silent flag when banned word detected).
alter table public.messages
  add column if not exists is_flagged boolean not null default false;
alter table public.messages
  add column if not exists flagged_at timestamptz default null;

comment on column public.messages.is_flagged is 'Set when content matches banned_words; for admin review.';

-- Chat reports: user reports another user with reason and message snapshot.
create table if not exists public.chat_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  reported_user_id uuid not null references public.profiles(id) on delete cascade,
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  reason text not null,
  message_snapshot jsonb not null default '[]',
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_chat_reports_reporter on public.chat_reports(reporter_id);
create index if not exists idx_chat_reports_reported on public.chat_reports(reported_user_id);
create index if not exists idx_chat_reports_status on public.chat_reports(status);

alter table public.chat_reports enable row level security;

create policy "Users can insert own reports"
  on public.chat_reports for insert
  with check (reporter_id = auth.uid());

create policy "Users can select own reports"
  on public.chat_reports for select
  using (reporter_id = auth.uid());

create policy "Admins can select all chat reports"
  on public.chat_reports for select
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "Admins can update chat reports"
  on public.chat_reports for update
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

comment on table public.chat_reports is 'User reports with reason and last 20 messages snapshot for moderation.';
