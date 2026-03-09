-- GarMusic Supabase bootstrap
-- Ejecutar en SQL Editor del proyecto GarMusic.

begin;

create table if not exists public.albums (
    id text primary key,
    data text not null,
    updated_at bigint not null
);

create table if not exists public.settings (
    key text primary key,
    value text not null,
    updated_at bigint not null
);

create table if not exists public.play_events (
    id text primary key,
    track_id text not null,
    album_id text not null,
    timestamp bigint not null,
    date text not null
);

create index if not exists idx_play_events_track on public.play_events(track_id);
create index if not exists idx_play_events_date on public.play_events(date);

create table if not exists public.messages (
    id text primary key,
    data text not null,
    timestamp bigint not null,
    read boolean not null default false
);

create index if not exists idx_messages_timestamp on public.messages(timestamp desc);

create table if not exists public.popups (
    id text primary key,
    data text not null,
    updated_at bigint not null
);

create table if not exists public.playlists (
    id text primary key,
    data text not null,
    updated_at bigint not null
);

create table if not exists public.audio_files (
    track_id text primary key,
    file_name text not null,
    mime_type text not null,
    file_path text not null,
    updated_at bigint not null
);

create table if not exists public.user_library_states (
    user_key text primary key,
    data text not null,
    updated_at bigint not null
);

create table if not exists public.release_preregistrations (
    id text primary key,
    album_id text not null,
    email text not null,
    name text not null default '',
    created_at bigint not null,
    updated_at bigint not null
);

create unique index if not exists ux_release_prereg_album_email
on public.release_preregistrations(album_id, email);

alter table public.albums disable row level security;
alter table public.settings disable row level security;
alter table public.play_events disable row level security;
alter table public.messages disable row level security;
alter table public.popups disable row level security;
alter table public.playlists disable row level security;
alter table public.audio_files disable row level security;
alter table public.user_library_states disable row level security;
alter table public.release_preregistrations disable row level security;

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on table public.albums to anon, authenticated;
grant select, insert, update, delete on table public.settings to anon, authenticated;
grant select, insert, update, delete on table public.play_events to anon, authenticated;
grant select, insert, update, delete on table public.messages to anon, authenticated;
grant select, insert, update, delete on table public.popups to anon, authenticated;
grant select, insert, update, delete on table public.playlists to anon, authenticated;
grant select, insert, update, delete on table public.audio_files to anon, authenticated;
grant select, insert, update, delete on table public.user_library_states to anon, authenticated;
grant select, insert, update, delete on table public.release_preregistrations to anon, authenticated;

commit;

insert into storage.buckets (id, name, public)
values ('garmusic-assets', 'garmusic-assets', true)
on conflict (id) do update set public = excluded.public;

insert into storage.buckets (id, name, public)
values ('garmusic-audio', 'garmusic-audio', false)
on conflict (id) do update set public = excluded.public;

do $$
begin
    if not exists (
        select 1 from pg_policies
        where schemaname = 'storage' and tablename = 'objects' and policyname = 'garmusic_assets_public_read'
    ) then
        create policy garmusic_assets_public_read
        on storage.objects for select
        to public
        using (bucket_id = 'garmusic-assets');
    end if;

    if not exists (
        select 1 from pg_policies
        where schemaname = 'storage' and tablename = 'objects' and policyname = 'garmusic_assets_insert'
    ) then
        create policy garmusic_assets_insert
        on storage.objects for insert
        to anon, authenticated
        with check (bucket_id = 'garmusic-assets');
    end if;

    if not exists (
        select 1 from pg_policies
        where schemaname = 'storage' and tablename = 'objects' and policyname = 'garmusic_assets_update'
    ) then
        create policy garmusic_assets_update
        on storage.objects for update
        to anon, authenticated
        using (bucket_id = 'garmusic-assets')
        with check (bucket_id = 'garmusic-assets');
    end if;

    if not exists (
        select 1 from pg_policies
        where schemaname = 'storage' and tablename = 'objects' and policyname = 'garmusic_assets_delete'
    ) then
        create policy garmusic_assets_delete
        on storage.objects for delete
        to anon, authenticated
        using (bucket_id = 'garmusic-assets');
    end if;

    if not exists (
        select 1 from pg_policies
        where schemaname = 'storage' and tablename = 'objects' and policyname = 'garmusic_audio_select'
    ) then
        create policy garmusic_audio_select
        on storage.objects for select
        to anon, authenticated
        using (bucket_id = 'garmusic-audio');
    end if;

    if not exists (
        select 1 from pg_policies
        where schemaname = 'storage' and tablename = 'objects' and policyname = 'garmusic_audio_insert'
    ) then
        create policy garmusic_audio_insert
        on storage.objects for insert
        to anon, authenticated
        with check (bucket_id = 'garmusic-audio');
    end if;

    if not exists (
        select 1 from pg_policies
        where schemaname = 'storage' and tablename = 'objects' and policyname = 'garmusic_audio_update'
    ) then
        create policy garmusic_audio_update
        on storage.objects for update
        to anon, authenticated
        using (bucket_id = 'garmusic-audio')
        with check (bucket_id = 'garmusic-audio');
    end if;

    if not exists (
        select 1 from pg_policies
        where schemaname = 'storage' and tablename = 'objects' and policyname = 'garmusic_audio_delete'
    ) then
        create policy garmusic_audio_delete
        on storage.objects for delete
        to anon, authenticated
        using (bucket_id = 'garmusic-audio');
    end if;
end $$;
