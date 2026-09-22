-- Bibliotheca schema. Row Level Security is enabled on every table; the browser only ever
-- holds the anon key, so these policies are the real access control.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------------------------
-- Profiles (one per auth user)
-- ---------------------------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text check (display_name is null or char_length(display_name) between 1 and 60),
  role text not null default 'patron' check (role in ('patron', 'staff')),
  show_mature boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles: read own" on public.profiles
  for select to authenticated using (id = (select auth.uid()));

create policy "profiles: update own" on public.profiles
  for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- Users may change their name and mature-content preference, never their role.
revoke update on public.profiles from authenticated;
grant update (display_name, show_mature) on public.profiles to authenticated;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    nullif(left(trim(coalesce(new.raw_user_meta_data ->> 'display_name', new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', '')), 60), '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.profiles where id = (select auth.uid()) and role = 'staff');
$$;

-- ---------------------------------------------------------------------------------------------
-- Shelf
-- ---------------------------------------------------------------------------------------------
create type public.shelf_status as enum ('WANT_TO_READ', 'READING', 'READ', 'FAVORITE');

create table public.shelf_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  book_id text not null check (book_id ~ '^(google:[A-Za-z0-9_-]{4,40}|ol:OL[0-9]+[WM]|gutenberg:[0-9]{1,7})$'),
  status public.shelf_status not null,
  progress real check (progress is null or (progress >= 0 and progress <= 1)),
  -- Small snapshot so the shelf renders without calling book APIs. Size-capped.
  book jsonb not null check (jsonb_typeof(book) = 'object' and pg_column_size(book) < 4096),
  added_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, book_id, status)
);

create index shelf_items_user_idx on public.shelf_items (user_id, updated_at desc);
create index shelf_items_book_idx on public.shelf_items (book_id);

alter table public.shelf_items enable row level security;

create policy "shelf: owner select" on public.shelf_items
  for select to authenticated using (user_id = (select auth.uid()));
create policy "shelf: owner insert" on public.shelf_items
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "shelf: owner update" on public.shelf_items
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "shelf: owner delete" on public.shelf_items
  for delete to authenticated using (user_id = (select auth.uid()));

create trigger shelf_touch before update on public.shelf_items
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------------------------
-- Reviews (one per user per book)
-- ---------------------------------------------------------------------------------------------
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  book_id text not null check (book_id ~ '^(google:[A-Za-z0-9_-]{4,40}|ol:OL[0-9]+[WM]|gutenberg:[0-9]{1,7})$'),
  rating smallint not null check (rating between 1 and 5),
  body text check (body is null or char_length(body) <= 4000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, book_id)
);

create index reviews_book_idx on public.reviews (book_id, created_at desc);

alter table public.reviews enable row level security;

create policy "reviews: owner select" on public.reviews
  for select to authenticated using (user_id = (select auth.uid()));
create policy "reviews: owner insert" on public.reviews
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "reviews: owner update" on public.reviews
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "reviews: owner delete" on public.reviews
  for delete to authenticated using (user_id = (select auth.uid()));

create trigger reviews_touch before update on public.reviews
  for each row execute function public.touch_updated_at();

-- Public review listing exposes display names only (never emails or roles).
create or replace function public.get_book_reviews(p_book_id text, p_limit int default 20, p_offset int default 0)
returns table (id uuid, rating smallint, body text, created_at timestamptz, updated_at timestamptz, reviewer text, is_mine boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select r.id, r.rating, r.body, r.created_at, r.updated_at,
         coalesce(p.display_name, 'A reader') as reviewer,
         r.user_id = (select auth.uid()) as is_mine
  from public.reviews r
  join public.profiles p on p.id = r.user_id
  where r.book_id = p_book_id
  order by (r.user_id = (select auth.uid())) desc, r.created_at desc
  limit least(greatest(p_limit, 1), 50) offset greatest(p_offset, 0);
$$;

create or replace function public.get_book_rating(p_book_id text)
returns table (average numeric, total bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select round(avg(rating)::numeric, 1), count(*) from public.reviews where book_id = p_book_id;
$$;

-- ---------------------------------------------------------------------------------------------
-- Curated shelves (staff picks, new arrivals)
-- ---------------------------------------------------------------------------------------------
create table public.curated_items (
  id uuid primary key default gen_random_uuid(),
  shelf text not null check (shelf in ('staff_picks', 'new_arrivals')),
  book_id text not null check (book_id ~ '^(google:[A-Za-z0-9_-]{4,40}|ol:OL[0-9]+[WM]|gutenberg:[0-9]{1,7})$'),
  book jsonb not null check (jsonb_typeof(book) = 'object' and pg_column_size(book) < 8192),
  note text check (note is null or char_length(note) <= 280),
  position int not null default 0,
  pinned_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (shelf, book_id)
);

alter table public.curated_items enable row level security;

create policy "curated: public read" on public.curated_items for select to anon, authenticated using (true);
create policy "curated: staff insert" on public.curated_items for insert to authenticated with check ((select public.is_staff()));
create policy "curated: staff update" on public.curated_items for update to authenticated using ((select public.is_staff())) with check ((select public.is_staff()));
create policy "curated: staff delete" on public.curated_items for delete to authenticated using ((select public.is_staff()));

-- ---------------------------------------------------------------------------------------------
-- Search analytics (write via RPC only, read by staff only)
-- ---------------------------------------------------------------------------------------------
create table public.search_log (
  id bigint generated always as identity primary key,
  term text not null check (char_length(term) between 2 and 100),
  created_at timestamptz not null default now()
);

create index search_log_created_idx on public.search_log (created_at desc);

alter table public.search_log enable row level security;
-- No policies: nobody reads or writes the table directly.

create or replace function public.log_search(p_term text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  t text := lower(regexp_replace(trim(coalesce(p_term, '')), '\s+', ' ', 'g'));
begin
  if char_length(t) < 2 or char_length(t) > 100 then return; end if;
  -- Skip ISBNs and email-looking strings: not useful as trends, and possibly personal.
  if t ~ '^[0-9xX -]{10,17}$' or t ~ '@' then return; end if;
  insert into public.search_log (term) values (t);
end;
$$;

create or replace function public.top_searches(p_days int default 30, p_limit int default 20)
returns table (term text, searches bigint)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;
  return query
    select s.term, count(*) from public.search_log s
    where s.created_at > now() - make_interval(days => least(greatest(p_days, 1), 365))
    group by s.term order by count(*) desc, s.term limit least(greatest(p_limit, 1), 100);
end;
$$;

create or replace function public.most_shelved(p_days int default 30, p_limit int default 20)
returns table (book_id text, book jsonb, shelvings bigint)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;
  return query
    select s.book_id, (array_agg(s.book order by s.updated_at desc))[1], count(distinct s.user_id)
    from public.shelf_items s
    where s.added_at > now() - make_interval(days => least(greatest(p_days, 1), 365))
    group by s.book_id order by count(distinct s.user_id) desc limit least(greatest(p_limit, 1), 100);
end;
$$;

-- ---------------------------------------------------------------------------------------------
-- Account deletion: removes the auth user; profiles, shelf and reviews cascade.
-- ---------------------------------------------------------------------------------------------
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
begin
  if uid is null then raise exception 'not authenticated' using errcode = '42501'; end if;
  delete from auth.users where id = uid;
end;
$$;

-- Function privileges: nothing is callable unless granted here.
revoke execute on all functions in schema public from public, anon, authenticated;
grant execute on function public.get_book_reviews(text, int, int) to anon, authenticated;
grant execute on function public.get_book_rating(text) to anon, authenticated;
grant execute on function public.log_search(text) to anon, authenticated;
grant execute on function public.is_staff() to authenticated;
grant execute on function public.top_searches(int, int) to authenticated;
grant execute on function public.most_shelved(int, int) to authenticated;
grant execute on function public.delete_my_account() to authenticated;
