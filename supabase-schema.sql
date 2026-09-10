create extension if not exists pgcrypto;

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  name text,
  email text,
  bio text default '',
  location text default '',
  photo text default '',
  role text default 'person',
  created_at timestamptz default now()
);

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete cascade,
  author text,
  author_name text default '',
  kind text,
  pet text,
  animal_type text default '',
  name text default '',
  breed text default '',
  age text default '',
  gender text default '',
  city text default '',
  location text default '',
  text text default '',
  description text default '',
  health text default '',
  vaccinated boolean default false,
  phone text default '',
  image_url text default '',
  status text default 'open',
  created_at timestamptz default now()
);

alter table public.posts add column if not exists author_name text default '';
alter table public.posts add column if not exists animal_type text default '';
alter table public.posts add column if not exists name text default '';
alter table public.posts add column if not exists breed text default '';
alter table public.posts add column if not exists age text default '';
alter table public.posts add column if not exists gender text default '';
alter table public.posts add column if not exists city text default '';
alter table public.posts add column if not exists description text default '';
alter table public.posts add column if not exists health text default '';
alter table public.posts add column if not exists vaccinated boolean default false;
alter table public.posts add column if not exists phone text default '';

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid references public.posts(id) on delete cascade,
  text text,
  author_id uuid references auth.users(id) on delete cascade,
  author_name text,
  created_at timestamptz default now()
);

create table if not exists public.likes (
  id uuid primary key default gen_random_uuid(),
  post_id uuid references public.posts(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  created_at timestamptz default now(),
  unique(post_id, user_id)
);

create table if not exists public.conversations (
  id text primary key,
  participant_ids text[] default array[]::text[],
  updated_at timestamptz default now()
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id text references public.conversations(id) on delete cascade,
  sender_id uuid references auth.users(id) on delete cascade,
  body text,
  created_at timestamptz default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  type text,
  message text,
  post_id uuid references public.posts(id),
  created_at timestamptz default now()
);

alter table public.users enable row level security;
alter table public.posts enable row level security;
alter table public.comments enable row level security;
alter table public.likes enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.notifications enable row level security;

create policy "users_read_all" on public.users for select using (true);
create policy "users_write_own" on public.users for update using (auth.uid() = id);
create policy "users_insert_own" on public.users for insert with check (auth.uid() = id);

create policy "posts_read_all" on public.posts for select using (true);
create policy "posts_insert_own" on public.posts for insert with check (auth.uid() = owner_id);
create policy "posts_update_own" on public.posts for update using (auth.uid() = owner_id);
create policy "posts_delete_own" on public.posts for delete using (auth.uid() = owner_id);

create policy "comments_read_all" on public.comments for select using (true);
create policy "comments_insert_own" on public.comments for insert with check (auth.uid() = author_id);

create policy "likes_read_all" on public.likes for select using (true);
create policy "likes_insert_own" on public.likes for insert with check (auth.uid() = user_id);
create policy "likes_delete_own" on public.likes for delete using (auth.uid() = user_id);

create policy "messages_read_all" on public.messages for select using (true);
create policy "messages_insert_own" on public.messages for insert with check (auth.uid() = sender_id);

create policy "notifications_read_own" on public.notifications for select using (auth.uid() = user_id);
create policy "notifications_insert_own" on public.notifications for insert with check (auth.uid() = user_id);

create policy "conversations_read_all" on public.conversations for select using (true);
create policy "conversations_write_all" on public.conversations for insert with check (true);
create policy "conversations_update_all" on public.conversations for update using (true);

-- Create the bucket manually in Supabase Dashboard:
-- Storage -> New bucket -> name: post_images
-- Leave it public if you want direct image URLs in the browser.

