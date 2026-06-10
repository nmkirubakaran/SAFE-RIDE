-- ═══════════════════════════════════════════════
--  SafeRide — Emergency tables setup
--  Paste into Supabase SQL Editor → Run
-- ═══════════════════════════════════════════════

-- 1. Medical info table
create table if not exists medical_info (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete cascade not null unique,
  blood_group text,
  age         integer,
  allergies   text,
  conditions  text,
  medications text,
  updated_at  timestamp with time zone default now()
);

-- 2. Update emergency contacts table to support multiple contacts
alter table emergency_contacts
  add column if not exists phone2 text,
  add column if not exists created_at timestamp with time zone default now();

-- Remove old unique constraint so multiple contacts are allowed
alter table emergency_contacts drop constraint if exists emergency_contacts_user_id_key;

-- ── Row Level Security ───────────────────────────
alter table medical_info enable row level security;

create policy "Users can view own medical info"
  on medical_info for select
  using (auth.uid() = user_id);

create policy "Users can upsert own medical info"
  on medical_info for insert
  with check (auth.uid() = user_id);

create policy "Users can update own medical info"
  on medical_info for update
  using (auth.uid() = user_id);

-- Allow public read for emergency page (no login needed)
create policy "Public can view medical info"
  on medical_info for select
  using (true);

create policy "Public can view emergency contacts"
  on emergency_contacts for select
  using (true);

create policy "Users can insert emergency contacts"
  on emergency_contacts for insert
  with check (auth.uid() = user_id);

create policy "Users can delete own emergency contacts"
  on emergency_contacts for delete
  using (auth.uid() = user_id);
