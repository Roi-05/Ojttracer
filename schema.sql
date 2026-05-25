-- ── PROFILES ──────────────────────────────────
create table if not exists public.profiles (
  id          uuid primary key default gen_random_uuid(),
  email       text not null unique,
  password_hash text not null,
  name        text not null,
  role        text not null check (role in ('student','company','admin')),
  avatar_url  text,
  created_at  timestamptz not null default now()
);

-- ── STUDENT-SPECIFIC FIELDS ────────────────────────────────────────────────
create table if not exists public.students (
  user_id            uuid primary key references public.profiles(id) on delete cascade,
  student_id         text default '',
  last_name          text default '',
  first_name         text default '',
  middle_name        text default '',
  section            text default '',
  course             text default 'BSIT',
  year_level         text default '4th Year',
  date_of_birth      date,
  civil_status       text default '',
  sex                text default '',
  phone              text default '',
  address            text default '',
  skills             jsonb not null default '[]'::jsonb,
  emergency_contact  text default '',
  intended_company_id uuid references public.companies(user_id),
  intended_position   text default ''
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
  signed_moa_url    text,
  accredited_until  text default '',
  latitude          numeric(10, 7),
  longitude         numeric(10, 7),
  geofence_radius   int not null default 200
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
