create table if not exists public.peeper_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  display_name text check (
    display_name is null or char_length(trim(display_name)) between 1 and 40
  ),
  avatar_url text,
  avatar_path text,
  updated_at timestamptz not null default now()
);

alter table public.peeper_profiles
  add column if not exists display_name text;

alter table public.peeper_profiles enable row level security;

drop policy if exists "Authenticated users can view Peeper profiles"
  on public.peeper_profiles;
create policy "Authenticated users can view Peeper profiles"
  on public.peeper_profiles for select to authenticated
  using (true);

drop policy if exists "Users can create their own Peeper profile"
  on public.peeper_profiles;
create policy "Users can create their own Peeper profile"
  on public.peeper_profiles for insert to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists "Users can update their own Peeper profile"
  on public.peeper_profiles;
create policy "Users can update their own Peeper profile"
  on public.peeper_profiles for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

insert into public.peeper_profiles (user_id, avatar_url, avatar_path)
select id, avatar_url, avatar_path
from public.profiles
where account_type = 'peeper'
  and avatar_url is not null
on conflict (user_id) do nothing;
