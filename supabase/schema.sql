-- ============================================================
-- ClipForge Supabase Schema
-- Run this in the Supabase SQL Editor
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================================
-- PROFILES TABLE
-- ============================================================
create table if not exists public.profiles (
  id          uuid references auth.users on delete cascade primary key,
  email       text not null,
  credits     integer not null default 50,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Enable RLS
alter table public.profiles enable row level security;

-- Policies
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Service role can do everything (for backend)
create policy "Service role full access to profiles"
  on public.profiles for all
  using (auth.role() = 'service_role');

-- ============================================================
-- JOBS TABLE
-- ============================================================
create table if not exists public.jobs (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid references public.profiles(id) on delete cascade not null,
  type            text not null check (type in ('text2video', 'image2video', 'lipsync')),
  status          text not null default 'queued' check (status in ('queued', 'processing', 'completed', 'failed')),
  prompt          text,
  settings        jsonb default '{}',
  replicate_id    text,
  video_url       text,
  thumbnail_url   text,
  credits_used    integer not null default 0,
  error_message   text,
  progress        integer default 0 check (progress >= 0 and progress <= 100),
  created_at      timestamptz not null default now(),
  completed_at    timestamptz
);

-- Indexes
create index if not exists jobs_user_id_idx on public.jobs(user_id);
create index if not exists jobs_status_idx on public.jobs(status);
create index if not exists jobs_created_at_idx on public.jobs(created_at desc);

-- Enable RLS
alter table public.jobs enable row level security;

-- Policies
create policy "Users can view own jobs"
  on public.jobs for select
  using (auth.uid() = user_id);

create policy "Users can insert own jobs"
  on public.jobs for insert
  with check (auth.uid() = user_id);

create policy "Service role full access to jobs"
  on public.jobs for all
  using (auth.role() = 'service_role');

-- ============================================================
-- CREDIT TRANSACTIONS TABLE
-- ============================================================
create table if not exists public.credit_transactions (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid references public.profiles(id) on delete cascade not null,
  amount      integer not null,  -- negative = debit, positive = credit
  balance_after integer not null,
  reason      text not null,
  job_id      uuid references public.jobs(id) on delete set null,
  created_at  timestamptz not null default now()
);

-- Indexes
create index if not exists credit_tx_user_id_idx on public.credit_transactions(user_id);
create index if not exists credit_tx_created_at_idx on public.credit_transactions(created_at desc);

-- Enable RLS
alter table public.credit_transactions enable row level security;

-- Policies
create policy "Users can view own transactions"
  on public.credit_transactions for select
  using (auth.uid() = user_id);

create policy "Service role full access to credit_transactions"
  on public.credit_transactions for all
  using (auth.role() = 'service_role');

-- ============================================================
-- TRIGGER: Auto-create profile on signup
-- ============================================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, credits)
  values (
    new.id,
    new.email,
    50  -- 50 free credits on signup
  );

  -- Also record the initial credit grant as a transaction
  insert into public.credit_transactions (user_id, amount, balance_after, reason)
  values (
    new.id,
    50,
    50,
    'Welcome bonus — 50 free credits'
  );

  return new;
end;
$$ language plpgsql security definer;

-- Drop trigger if exists and recreate
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- TRIGGER: Update updated_at on profiles
-- ============================================================
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.handle_updated_at();

-- ============================================================
-- USER_CREDITS TABLE (used by backend credits utility)
-- ============================================================
create table if not exists public.user_credits (
  user_id        text primary key,
  balance        integer not null default 0,
  payment_status text not null default 'pending'  -- 'pending' | 'confirmed'
);

alter table public.user_credits enable row level security;

create policy "Users can view own credits"
  on public.user_credits for select
  using (auth.uid()::text = user_id);

create policy "Service role full access to user_credits"
  on public.user_credits for all
  using (auth.role() = 'service_role');

-- Add payment_status column to existing deployments (safe to run multiple times)
do $$ begin
  if not exists (
    select 1 from information_schema.columns
    where table_name = 'user_credits' and column_name = 'payment_status'
  ) then
    alter table public.user_credits
      add column payment_status text not null default 'pending';
  end if;
end $$;

-- ============================================================
-- PAYFAST TRANSACTIONS TABLE
-- Stores every PayFast ITN that passes all validation checks.
-- Provides a complete audit trail: payment ID, amount, profit,
-- and the credits granted — separate from the running
-- credit_transactions history so finance can reconcile easily.
-- ============================================================
create table if not exists public.payfast_transactions (
  id              uuid primary key default gen_random_uuid(),
  user_id         text not null,                   -- auth.users UUID as text (matches user_credits.user_id)
  package_key     text not null,                   -- 'starter' | 'pro' | 'studio'
  credits_granted integer not null,
  amount_paid     decimal(10,2) not null,           -- gross amount received from PayFast (ZAR)
  profit          decimal(10,2) not null,           -- amount_paid - api_cost
  pf_payment_id   text,                            -- PayFast's own payment reference
  status          text not null default 'confirmed',
  created_at      timestamptz not null default now()
);

-- Indexes
create index if not exists payfast_tx_user_id_idx   on public.payfast_transactions(user_id);
create index if not exists payfast_tx_created_at_idx on public.payfast_transactions(created_at desc);
create index if not exists payfast_tx_pf_id_idx     on public.payfast_transactions(pf_payment_id);

-- Enable RLS
alter table public.payfast_transactions enable row level security;

-- Users can see their own purchase history
create policy "Users can view own payfast transactions"
  on public.payfast_transactions for select
  using (auth.uid()::text = user_id);

-- Only the service role (backend) can write
create policy "Service role full access to payfast_transactions"
  on public.payfast_transactions for all
  using (auth.role() = 'service_role');

-- ============================================================
-- JOBS TABLE — extra columns used by the backend
-- ============================================================
-- Add columns not in the original schema (safe to run multiple times via IF NOT EXISTS logic)
do $$ begin
  if not exists (select 1 from information_schema.columns where table_name='jobs' and column_name='job_id') then
    alter table public.jobs add column job_id text unique;
  end if;
  if not exists (select 1 from information_schema.columns where table_name='jobs' and column_name='deleted') then
    alter table public.jobs add column deleted boolean not null default false;
  end if;
  if not exists (select 1 from information_schema.columns where table_name='jobs' and column_name='negative_prompt') then
    alter table public.jobs add column negative_prompt text;
  end if;
  if not exists (select 1 from information_schema.columns where table_name='jobs' and column_name='style') then
    alter table public.jobs add column style text;
  end if;
  if not exists (select 1 from information_schema.columns where table_name='jobs' and column_name='duration') then
    alter table public.jobs add column duration integer;
  end if;
  if not exists (select 1 from information_schema.columns where table_name='jobs' and column_name='aspect_ratio') then
    alter table public.jobs add column aspect_ratio text;
  end if;
  if not exists (select 1 from information_schema.columns where table_name='jobs' and column_name='quality') then
    alter table public.jobs add column quality text;
  end if;
  if not exists (select 1 from information_schema.columns where table_name='jobs' and column_name='provider_job_id') then
    alter table public.jobs add column provider_job_id text;
  end if;
  if not exists (select 1 from information_schema.columns where table_name='jobs' and column_name='image_url') then
    alter table public.jobs add column image_url text;
  end if;
  if not exists (select 1 from information_schema.columns where table_name='jobs' and column_name='motion_prompt') then
    alter table public.jobs add column motion_prompt text;
  end if;
  if not exists (select 1 from information_schema.columns where table_name='jobs' and column_name='video_url') then
    alter table public.jobs add column video_url text;
  end if;
  if not exists (select 1 from information_schema.columns where table_name='jobs' and column_name='audio_url') then
    alter table public.jobs add column audio_url text;
  end if;
  if not exists (select 1 from information_schema.columns where table_name='jobs' and column_name='tts_text') then
    alter table public.jobs add column tts_text text;
  end if;
  if not exists (select 1 from information_schema.columns where table_name='jobs' and column_name='error') then
    alter table public.jobs add column error text;
  end if;
end $$;

-- Additional RLS policies for jobs
create policy "Users can delete own jobs"
  on public.jobs for delete
  using (auth.uid() = user_id);

create policy "Users can update own jobs"
  on public.jobs for update
  using (auth.uid() = user_id);

-- ============================================================
-- STORAGE BUCKETS
-- Run these in the Supabase dashboard or via API
-- ============================================================
-- insert into storage.buckets (id, name, public) values ('videos', 'videos', true);
-- insert into storage.buckets (id, name, public) values ('images', 'images', true);

-- Storage policies (run after creating buckets):
create policy "Users can upload own images"
  on storage.objects for insert
  with check (bucket_id = 'images' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Users can upload own videos"
  on storage.objects for insert
  with check (bucket_id = 'videos' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Anyone can view images"
  on storage.objects for select
  using (bucket_id = 'images');

create policy "Anyone can view videos"
  on storage.objects for select
  using (bucket_id = 'videos');

create policy "Users can delete own files"
  on storage.objects for delete
  using (auth.uid()::text = (storage.foldername(name))[1]);

create policy "Service role can manage all storage"
  on storage.objects for all
  using (auth.role() = 'service_role');

-- ============================================================
-- VIEWS (Optional — useful for dashboard stats)
-- ============================================================
create or replace view public.user_stats as
select
  p.id as user_id,
  p.email,
  p.credits as current_credits,
  count(j.id) as total_videos,
  count(j.id) filter (where j.status = 'completed') as completed_videos,
  coalesce(sum(j.credits_used), 0) as total_credits_used,
  coalesce(sum(case when j.type = 'text2video' then 1 else 0 end), 0) as text2video_count,
  coalesce(sum(case when j.type = 'image2video' then 1 else 0 end), 0) as image2video_count,
  coalesce(sum(case when j.type = 'lipsync' then 1 else 0 end), 0) as lipsync_count
from public.profiles p
left join public.jobs j on j.user_id = p.id
group by p.id, p.email, p.credits;

-- Grant access to the view
grant select on public.user_stats to authenticated;
grant select on public.user_stats to service_role;

-- ============================================================
-- STRIPE TRANSACTIONS TABLE
-- Stores every successful Stripe Checkout Session.
-- ============================================================
create table if not exists public.stripe_transactions (
  id                  uuid primary key default gen_random_uuid(),
  user_id             text not null,
  package_key         text not null,
  credits_granted     integer not null,
  amount_paid_cents   integer not null,          -- USD cents
  stripe_session_id   text unique,
  status              text not null default 'confirmed',
  created_at          timestamptz not null default now()
);

create index if not exists stripe_tx_user_id_idx      on public.stripe_transactions(user_id);
create index if not exists stripe_tx_created_at_idx   on public.stripe_transactions(created_at desc);
create index if not exists stripe_tx_session_id_idx   on public.stripe_transactions(stripe_session_id);

alter table public.stripe_transactions enable row level security;

create policy "Users can view own stripe transactions"
  on public.stripe_transactions for select
  using (auth.uid()::text = user_id);

create policy "Service role full access to stripe_transactions"
  on public.stripe_transactions for all
  using (auth.role() = 'service_role');

-- ============================================================
-- APPSUMO CODES TABLE
-- Pre-loaded by admin; each row is one redeemable LTD code.
-- ============================================================
create table if not exists public.appsumo_codes (
  code          text primary key,                -- e.g. CF-A1B2-C3D4-E5F6
  tier          integer not null default 1,      -- 1 | 2 | 3 (for reference only)
  redeemed_by   text,                            -- user_id who redeemed it
  redeemed_at   timestamptz
);

create index if not exists appsumo_codes_redeemed_by_idx on public.appsumo_codes(redeemed_by);

alter table public.appsumo_codes enable row level security;

-- Users cannot read the codes table (no enumeration)
create policy "Service role full access to appsumo_codes"
  on public.appsumo_codes for all
  using (auth.role() = 'service_role');

-- ============================================================
-- USER_CREDITS — add account_type column for LTD users
-- ============================================================
do $$ begin
  if not exists (
    select 1 from information_schema.columns
    where table_name = 'user_credits' and column_name = 'account_type'
  ) then
    alter table public.user_credits
      add column account_type text not null default 'standard';  -- 'standard' | 'ltd'
  end if;
end $$;
