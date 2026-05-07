-- ════════════════════════════════════════════════════════════════════════════
-- PampangaStateU-Link — Initial relational schema
-- Run this once in the Supabase SQL Editor (or via `supabase db push`).
-- ════════════════════════════════════════════════════════════════════════════

-- ── PROFILES (one row per auth.users row) ──────────────────────────────────
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null unique,
  name        text not null,
  role        text not null check (role in ('student','company','admin')),
  created_at  timestamptz not null default now()
);

-- ── STUDENT-SPECIFIC FIELDS ────────────────────────────────────────────────
create table if not exists public.students (
  user_id            uuid primary key references public.profiles(id) on delete cascade,
  student_id         text default '',
  section            text default '',
  phone              text default '',
  address            text default '',
  skills             jsonb not null default '[]'::jsonb,
  emergency_contact  text default ''
);

-- ── COMPANY-SPECIFIC FIELDS ────────────────────────────────────────────────
create table if not exists public.companies (
  user_id           uuid primary key references public.profiles(id) on delete cascade,
  company_name      text default '',
  industry          text default '',
  company_address   text default '',
  website           text default '',
  hr_contact        text default '',
  hr_email          text default '',
  phone             text default '',
  description       text default '',
  moa_status        text default 'pending',
  accredited_until  text default ''
);

-- ── DAILY TIME RECORDS ─────────────────────────────────────────────────────
create table if not exists public.dtr_records (
  id                  bigserial primary key,
  student_id          uuid not null references public.profiles(id) on delete cascade,
  date                date not null,
  day                 text default '',
  time_in             text,
  time_out            text,
  time_in_photo_url   text,
  time_out_photo_url  text,
  hours               numeric not null default 0,
  remarks             text not null default 'Regular',
  unique (student_id, date)
);
create index if not exists idx_dtr_student_date on public.dtr_records(student_id, date desc);

-- ── DAILY ACCOMPLISHMENTS ──────────────────────────────────────────────────
create table if not exists public.accomplishments (
  id           text primary key,                  -- millisecond timestamp string
  student_id   uuid not null references public.profiles(id) on delete cascade,
  date         date not null,
  hours        numeric not null,
  details      text not null,
  photo_url    text,
  status       text not null default 'pending' check (status in ('pending','approved','rejected')),
  review_note  text default '',
  created_at   timestamptz not null default now()
);
create index if not exists idx_acc_student_date on public.accomplishments(student_id, date desc);

-- ── STUDENT DOCUMENT SUBMISSIONS ───────────────────────────────────────────
create table if not exists public.documents (
  id             bigserial primary key,
  student_id     uuid not null references public.profiles(id) on delete cascade,
  name           text not null,
  status         text not null default 'pending' check (status in ('pending','approved','rejected','missing')),
  file_url       text,
  uploaded_date  text default '—',
  review_note    text default '',
  unique (student_id, name)
);

-- ── ADMIN-UPLOADED TEMPLATES ───────────────────────────────────────────────
create table if not exists public.templates (
  doc_slug       text primary key,
  name           text not null,
  file_url       text,
  size           text default '—',
  uploaded_date  text default '—'
);

-- ── ANNOUNCEMENTS ──────────────────────────────────────────────────────────
create table if not exists public.announcements (
  id          text primary key,
  title       text not null,
  content     text not null,
  category    text not null default 'update',
  priority    text not null default 'normal',
  date        text,
  created_at  timestamptz not null default now()
);

-- ── DEPLOYMENTS (student ↔ company assignment) ─────────────────────────────
create table if not exists public.deployments (
  student_id        uuid primary key references public.profiles(id) on delete cascade,
  company_id        uuid references public.profiles(id) on delete set null,
  company_name      text,
  supervisor        text default '',
  supervisor_email  text default '',
  address           text default '',
  start_date        text,
  end_date          text,
  required_hours    int not null default 486,
  position          text,
  status            text not null default 'ongoing',
  deployed_at       timestamptz not null default now()
);
create index if not exists idx_deployments_company on public.deployments(company_id);

-- ── EVALUATIONS (one per student) ──────────────────────────────────────────
create table if not exists public.evaluations (
  student_id     uuid primary key references public.profiles(id) on delete cascade,
  student_name   text,
  company_id     uuid references public.profiles(id) on delete set null,
  scores         jsonb not null default '{}'::jsonb,
  overall_score  numeric not null default 0,
  comments       text default '',
  submitted_at   timestamptz not null default now()
);

-- ── EXTRA INDEXES ──────────────────────────────────────────────────────────
-- Fast role-based filtering (used by getStudents / getCompanies / getDocuments)
create index if not exists idx_profiles_role  on public.profiles(role);
-- Fast email lookup (used by auth self-heal and duplicate-check logic)
create index if not exists idx_profiles_email on public.profiles(email);

-- ── AUTO-PROFILE TRIGGER ───────────────────────────────────────────────────
-- Inserts a profiles row (and the matching students/companies row) immediately
-- when auth.users gets a new entry.  This makes registration atomic: even if
-- the edge function crashes between createUser() and the subsequent INSERT,
-- the profile row already exists so the user is never left orphaned.
--
-- The server's own upsert (onConflict:"id") is a safe no-op when this trigger
-- has already created the row — both paths always produce the same data.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_role text;
  v_name text;
begin
  v_role := coalesce(new.raw_user_meta_data->>'role', 'student');
  v_name := coalesce(new.raw_user_meta_data->>'name', new.email);

  -- Create the base profile.  ON CONFLICT DO NOTHING means the server's own
  -- upsert (which runs right after createUser returns) will not overwrite it.
  insert into public.profiles (id, email, name, role)
  values (new.id, new.email, v_name, v_role)
  on conflict (id) do nothing;

  -- Create the role-specific detail row.
  if v_role = 'student' then
    insert into public.students (user_id)
    values (new.id)
    on conflict (user_id) do nothing;

  elsif v_role = 'company' then
    insert into public.companies (user_id, hr_email, company_name, hr_contact)
    values (
      new.id,
      new.email,
      coalesce(new.raw_user_meta_data->>'companyName', v_name),
      v_name
    )
    on conflict (user_id) do nothing;
  end if;

  return new;
end;
$$;

-- Drop before recreating to keep this migration idempotent on re-runs.
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ── RLS: disabled — server uses the service-role key and enforces auth in code.
-- (Enable later if you want to call PostgREST directly from the browser.)
alter table public.profiles        disable row level security;
alter table public.students        disable row level security;
alter table public.companies       disable row level security;
alter table public.dtr_records     disable row level security;
alter table public.accomplishments disable row level security;
alter table public.documents       disable row level security;
alter table public.templates       disable row level security;
alter table public.announcements   disable row level security;
alter table public.deployments     disable row level security;
alter table public.evaluations     disable row level security;