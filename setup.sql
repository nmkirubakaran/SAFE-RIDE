-- ═══════════════════════════════════════════════
--  SafeRide — Supabase database setup
--  Paste this entire file into:
--  Supabase dashboard → SQL Editor → New query → Run
-- ═══════════════════════════════════════════════

-- 1. Documents table
create table if not exists documents (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references auth.users(id) on delete cascade not null,
  doc_type     text not null,
  file_name    text not null,
  file_url     text not null,
  file_path    text not null,
  expiry_date  date,
  created_at   timestamp with time zone default now()
);

-- 2. Emergency contacts table
create table if not exists emergency_contacts (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references auth.users(id) on delete cascade not null unique,
  name         text,
  phone        text,
  relation     text,
  blood_group  text,
  allergies    text,
  updated_at   timestamp with time zone default now()
);

-- ── Row Level Security (RLS) ─────────────────────
-- Users can only see and edit their own data

alter table documents          enable row level security;
alter table emergency_contacts enable row level security;

-- Documents policies
create policy "Users can view own documents"
  on documents for select
  using (auth.uid() = user_id);

create policy "Users can insert own documents"
  on documents for insert
  with check (auth.uid() = user_id);

create policy "Users can delete own documents"
  on documents for delete
  using (auth.uid() = user_id);

-- Emergency contacts policies
create policy "Users can view own emergency contact"
  on emergency_contacts for select
  using (auth.uid() = user_id);

create policy "Users can upsert own emergency contact"
  on emergency_contacts for insert
  with check (auth.uid() = user_id);

create policy "Users can update own emergency contact"
  on emergency_contacts for update
  using (auth.uid() = user_id);
