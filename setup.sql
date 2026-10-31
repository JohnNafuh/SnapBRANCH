-- Run once in Supabase: SQL Editor > New query > Run
create table public.snaps (
  id uuid primary key default gen_random_uuid(),
  handle text not null check (char_length(handle) between 2 and 20),
  location text check (char_length(location) <= 60),
  image_path text not null check (image_path ~ '^[a-z0-9-]+\.jpg$'),
  created_at timestamptz not null default now()
);
alter table public.snaps enable row level security;
create policy "anyone can read"  on public.snaps for select using (true);
create policy "anyone can post"  on public.snaps for insert with check (true);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('snaps', 'snaps', true, 1048576, array['image/jpeg']);
create policy "anyone can upload snaps" on storage.objects
  for insert to anon with check (bucket_id = 'snaps');
