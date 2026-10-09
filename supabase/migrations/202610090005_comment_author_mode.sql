alter table public.artwork_comments
  add column if not exists author_mode text;

alter table public.artwork_comments
  drop constraint if exists artwork_comments_author_mode_check;

alter table public.artwork_comments
  add constraint artwork_comments_author_mode_check
  check (author_mode is null or author_mode in ('maker', 'peeper'));

notify pgrst, 'reload schema';
