-- ═══════════════════════════════════════════════
--  RYDEX — New tables setup
--  Run in Supabase SQL Editor
-- ═══════════════════════════════════════════════

-- 1. Profiles table
create table if not exists profiles (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete cascade not null unique,
  full_name   text,
  phone       text,
  bio         text,
  city        text,
  dob         date,
  avatar_url  text,
  updated_at  timestamp with time zone default now()
);
alter table profiles enable row level security;
create policy "Users can manage own profile" on profiles for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 2. Vehicles table
create table if not exists vehicles (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete cascade not null,
  name        text not null,
  type        text,
  reg_number  text,
  model       text,
  year        integer,
  color       text,
  licence     text,
  created_at  timestamp with time zone default now()
);
alter table vehicles enable row level security;
create policy "Users can manage own vehicles" on vehicles for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 3. Add vehicle_id column to documents (link docs to vehicles)
alter table documents add column if not exists vehicle_id uuid references vehicles(id) on delete set null;

-- 4. Avatars storage bucket (run separately in Storage tab)
-- Create a bucket named "avatars" with Public = ON
