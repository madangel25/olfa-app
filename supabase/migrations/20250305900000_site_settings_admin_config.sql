-- Add admin-configurable site fields: site name, maintenance mode, contact email.
alter table public.site_settings
  add column if not exists site_name text;
alter table public.site_settings
  add column if not exists maintenance_mode boolean not null default false;
alter table public.site_settings
  add column if not exists contact_email text;

comment on column public.site_settings.site_name is 'Display name of the site (e.g. Olfa).';
comment on column public.site_settings.maintenance_mode is 'When true, show maintenance message to non-admins.';
comment on column public.site_settings.contact_email is 'Contact email shown to users (support, etc.).';
