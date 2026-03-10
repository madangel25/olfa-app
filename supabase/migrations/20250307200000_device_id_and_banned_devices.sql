-- Device fingerprint tracking and device ban.
-- profiles.device_id: set on signup/login via FingerprintJS (visitorId).
-- banned_devices: admin can ban a device_id to block all accounts using it.

alter table public.profiles
  add column if not exists device_id text default null;

comment on column public.profiles.device_id is 'Browser/device fingerprint (e.g. FingerprintJS visitorId) for multi-account detection.';

create table if not exists public.banned_devices (
  id uuid primary key default gen_random_uuid(),
  device_id text not null unique,
  created_at timestamptz not null default now(),
  banned_by uuid references auth.users(id) on delete set null
);

create index if not exists idx_banned_devices_device_id on public.banned_devices(device_id);

comment on table public.banned_devices is 'Device IDs banned from the platform; blocks all accounts using that device.';

alter table public.banned_devices enable row level security;

-- Admins can select all; any user can check if their own device is banned (for access API).
create policy "Admins can select banned_devices"
  on public.banned_devices for select
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.role = 'admin'
    )
  );

create policy "Users can check own device in banned_devices"
  on public.banned_devices for select
  using (
    device_id in (
      select profiles.device_id from public.profiles
      where profiles.id = auth.uid() and profiles.device_id is not null
    )
  );

create policy "Admins can insert banned_devices"
  on public.banned_devices for insert
  with check (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.role = 'admin'
    )
  );

create policy "Admins can delete banned_devices"
  on public.banned_devices for delete
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.role = 'admin'
    )
  );
