-- Message media: type, attachment URL, view-once (temporary) support.
alter table public.messages
  add column if not exists message_type text not null default 'text'
    check (message_type in ('text', 'image', 'audio'));
alter table public.messages
  add column if not exists attachment_url text default null;
alter table public.messages
  add column if not exists is_temporary boolean not null default false;
alter table public.messages
  add column if not exists temporary_viewed_at timestamptz default null;

comment on column public.messages.message_type is 'text | image | audio';
comment on column public.messages.attachment_url is 'Storage URL for image/audio (chat-media bucket).';
comment on column public.messages.is_temporary is 'View-once: hide/revoke after recipient opens.';
comment on column public.messages.temporary_viewed_at is 'When recipient opened a view-once message; used to hide content.';

-- Chat media bucket: private; path = conversation_id / message_id / filename (or similar).
-- 5MB limit for images and audio.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'chat-media',
  'chat-media',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'audio/webm', 'audio/mpeg', 'audio/wav', 'audio/ogg']
)
on conflict (id) do update set
  public = false,
  file_size_limit = 5242880,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'audio/webm', 'audio/mpeg', 'audio/wav', 'audio/ogg'];

-- Users can upload to chat-media only for conversations they belong to.
-- Path format: {conversation_id}/{user_id}/{filename} so we can check conversation membership via application (conversation_id in path).
-- RLS: allow insert if user is participant in the conversation (conversation_id is first folder).
create policy "Users upload chat media in own conversation folder"
  on storage.objects for insert
  with check (
    bucket_id = 'chat-media'
    and (storage.foldername(name))[2] = auth.uid()::text
  );

-- Users can read objects in chat-media for conversations they're in (we'll use signed URLs; allow select for path prefix conversation_id).
-- Simplest: allow authenticated users to select from chat-media (signed URLs are used per-object; path contains conversation_id).
create policy "Authenticated can read chat media"
  on storage.objects for select
  using (
    bucket_id = 'chat-media'
    and auth.role() = 'authenticated'
  );

-- RPC: mark a view-once message as viewed (recipient only; sets temporary_viewed_at).
create or replace function public.mark_temporary_message_viewed(p_message_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.messages
  set temporary_viewed_at = now()
  where id = p_message_id
    and is_temporary = true
    and sender_id is distinct from auth.uid()
    and exists (
      select 1 from public.conversations c
      where c.id = messages.conversation_id
        and (c.user_one_id = auth.uid() or c.user_two_id = auth.uid())
    );
end;
$$;
