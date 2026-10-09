alter table public.artwork_comments
  add column if not exists parent_comment_id uuid
  references public.artwork_comments(id) on delete cascade;

create index if not exists artwork_comments_parent_comment_idx
  on public.artwork_comments (parent_comment_id);

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

drop policy if exists "Users can comment where comments are enabled"
  on public.artwork_comments;
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
