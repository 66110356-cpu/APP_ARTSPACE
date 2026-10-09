create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique,
  account_type text not null check (account_type in ('maker', 'peeper')),
  artist_name text,
  role text,
  bio text not null default '',
  avatar_url text,
  avatar_path text,
  created_at timestamptz not null default now(),
  constraint maker_has_artist_name check (account_type <> 'maker' or nullif(trim(artist_name), '') is not null),
  constraint username_format check (username ~ '^[a-z0-9_]{3,24}$')
);

alter table public.profiles add column if not exists avatar_path text;
alter table public.profiles drop column if exists email;

create or replace function public.prevent_profile_identity_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.id is distinct from old.id
    or new.username is distinct from old.username
    or new.account_type is distinct from old.account_type
  then
    raise exception 'Account identity fields cannot be changed here';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_profile_identity on public.profiles;
create trigger protect_profile_identity
  before update on public.profiles
  for each row execute procedure public.prevent_profile_identity_change();

create table if not exists public.artworks (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 160),
  description text not null default '',
  category text not null check (category in ('Illustration', '3D Art', 'Character Design', 'Graphic Design', 'Photography')),
  software text not null default '',
  image_path text not null,
  image_url text not null,
  comments_enabled boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists artworks_created_at_idx on public.artworks (created_at desc);
create index if not exists artworks_owner_id_idx on public.artworks (owner_id);
create index if not exists artworks_category_idx on public.artworks (category);

create table if not exists public.artwork_comments (
  id uuid primary key default gen_random_uuid(),
  artwork_id uuid not null references public.artworks(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  parent_comment_id uuid references public.artwork_comments(id) on delete cascade,
  author_mode text check (author_mode in ('maker', 'peeper')),
  body text not null check (char_length(trim(body)) between 1 and 1000),
  created_at timestamptz not null default now()
);

create index if not exists artwork_comments_artwork_created_idx
  on public.artwork_comments (artwork_id, created_at);
create index if not exists artwork_comments_parent_comment_idx
  on public.artwork_comments (parent_comment_id);

create table if not exists public.artwork_likes (
  artwork_id uuid not null references public.artworks(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (artwork_id, user_id)
);

create table if not exists public.saved_artworks (
  artwork_id uuid not null references public.artworks(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (artwork_id, user_id)
);

create table if not exists public.artist_follows (
  artist_id uuid not null references public.profiles(id) on delete cascade,
  follower_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (artist_id, follower_id),
  constraint no_self_follow check (artist_id <> follower_id)
);

create or replace function public.handle_new_artspace_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  account_type_value text := coalesce(new.raw_user_meta_data ->> 'account_type', 'peeper');
begin
  if account_type_value not in ('maker', 'peeper') then
    raise exception 'Invalid ArtSpace account type';
  end if;

  insert into public.profiles (
    id, username, account_type, artist_name, role, bio
  ) values (
    new.id,
    lower(trim(new.raw_user_meta_data ->> 'username')),
    account_type_value,
    nullif(trim(new.raw_user_meta_data ->> 'artist_name'), ''),
    case when account_type_value = 'maker' then 'Digital Artist • Illustrator • 3D Artist' else null end,
    case when account_type_value = 'maker'
      then 'I love creating characters, fantasy worlds and visual stories.'
      else '' end
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_artspace on auth.users;
create trigger on_auth_user_created_artspace
  after insert on auth.users
  for each row execute procedure public.handle_new_artspace_user();

alter table public.profiles enable row level security;
alter table public.artworks enable row level security;
alter table public.artwork_comments enable row level security;
alter table public.artwork_likes enable row level security;
alter table public.saved_artworks enable row level security;
alter table public.artist_follows enable row level security;

drop policy if exists "Authenticated users can view profiles" on public.profiles;
create policy "Authenticated users can view profiles"
  on public.profiles for select to authenticated using (true);
drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
  on public.profiles for update to authenticated using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

drop policy if exists "Authenticated users can view artworks" on public.artworks;
create policy "Authenticated users can view artworks"
  on public.artworks for select to authenticated using (true);
drop policy if exists "Makers can publish their own artworks" on public.artworks;
create policy "Makers can publish their own artworks"
  on public.artworks for insert to authenticated
  with check (
    owner_id = (select auth.uid()) and exists (
      select 1 from public.profiles
      where id = (select auth.uid()) and account_type = 'maker'
    )
  );
drop policy if exists "Makers can update their own artworks" on public.artworks;
create policy "Makers can update their own artworks"
  on public.artworks for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));
drop policy if exists "Makers can delete their own artworks" on public.artworks;
create policy "Makers can delete their own artworks"
  on public.artworks for delete to authenticated using (owner_id = (select auth.uid()));

drop policy if exists "Authenticated users can read comments" on public.artwork_comments;
create policy "Authenticated users can read comments"
  on public.artwork_comments for select to authenticated using (
    exists (
      select 1 from public.artworks
      where id = artwork_id and comments_enabled = true
    )
  );
create or replace function public.can_reply_to_artwork_comment(
  parent_comment_id uuid,
  target_artwork_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.artwork_comments as parent
    join public.artworks as artwork on artwork.id = parent.artwork_id
    join public.profiles as maker on maker.id = artwork.owner_id
    where parent.id = $1
      and parent.artwork_id = $2
      and parent.parent_comment_id is null
      and parent.author_id <> (select auth.uid())
      and artwork.owner_id = (select auth.uid())
      and artwork.comments_enabled = true
      and maker.account_type = 'maker'
  );
$$;
revoke all on function public.can_reply_to_artwork_comment(uuid, uuid) from public;
grant execute on function public.can_reply_to_artwork_comment(uuid, uuid) to authenticated;

drop policy if exists "Users can comment where comments are enabled" on public.artwork_comments;
create policy "Users can comment where comments are enabled"
  on public.artwork_comments for insert to authenticated
  with check (
    author_id = (select auth.uid()) and exists (
      select 1 from public.artworks
      where id = artwork_id and comments_enabled = true
    ) and (
      parent_comment_id is null
      or public.can_reply_to_artwork_comment(parent_comment_id, artwork_id)
    )
  );

drop policy if exists "Authenticated users can read likes" on public.artwork_likes;
create policy "Authenticated users can read likes"
  on public.artwork_likes for select to authenticated using (true);
drop policy if exists "Users can like as themselves" on public.artwork_likes;
create policy "Users can like as themselves"
  on public.artwork_likes for insert to authenticated
  with check (user_id = (select auth.uid()));
drop policy if exists "Users can remove their own likes" on public.artwork_likes;
create policy "Users can remove their own likes"
  on public.artwork_likes for delete to authenticated using (user_id = (select auth.uid()));

drop policy if exists "Users can view their own saved artworks" on public.saved_artworks;
create policy "Users can view their own saved artworks"
  on public.saved_artworks for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists "Users can save artworks for themselves" on public.saved_artworks;
create policy "Users can save artworks for themselves"
  on public.saved_artworks for insert to authenticated
  with check (user_id = (select auth.uid()));
drop policy if exists "Users can remove their own saved artworks" on public.saved_artworks;
create policy "Users can remove their own saved artworks"
  on public.saved_artworks for delete to authenticated using (user_id = (select auth.uid()));

drop policy if exists "Authenticated users can view follows" on public.artist_follows;
create policy "Authenticated users can view follows"
  on public.artist_follows for select to authenticated using (true);
drop policy if exists "Users can follow as themselves" on public.artist_follows;
create policy "Users can follow as themselves"
  on public.artist_follows for insert to authenticated
  with check (follower_id = (select auth.uid()));
drop policy if exists "Users can unfollow as themselves" on public.artist_follows;
create policy "Users can unfollow as themselves"
  on public.artist_follows for delete to authenticated using (follower_id = (select auth.uid()));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('artworks', 'artworks', true, 2097152, array['image/webp'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Artwork images are publicly viewable" on storage.objects;
create policy "Artwork images are publicly viewable"
  on storage.objects for select to public using (bucket_id = 'artworks');
drop policy if exists "Makers can upload their own images" on storage.objects;
create policy "Makers can upload their own images"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'artworks'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and exists (
      select 1 from public.profiles
      where id = (select auth.uid()) and account_type = 'maker'
    )
  );
drop policy if exists "Makers can update their own images" on storage.objects;
create policy "Makers can update their own images"
  on storage.objects for update to authenticated
  using (bucket_id = 'artworks' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'artworks' and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists "Makers can delete their own images" on storage.objects;
create policy "Makers can delete their own images"
  on storage.objects for delete to authenticated
  using (bucket_id = 'artworks' and (storage.foldername(name))[1] = (select auth.uid())::text);

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'artworks'
  ) then
    alter publication supabase_realtime add table public.artworks;
  end if;
end;
$$;
