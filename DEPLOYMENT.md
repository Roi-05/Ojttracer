# Deployment Guide (Render + Supabase, free tier)

Architecture:
- **Supabase**: Postgres database + Storage bucket for uploads
- **Render Web Service #1** (Node): Express API + built React app (one URL)
- **Render Web Service #2** (Docker): Gotenberg/LibreOffice for DOCX -> PDF

## 1. Supabase (Completed)
- [x] Create a project (region: Singapore). Save the DB password.
- [x] SQL Editor: run [schema.sql](schema.sql), then enable RLS on all tables.
- [x] **Connect** button -> Session pooler URI -> `DATABASE_URL`.
- [x] Create the first superadmin row (bcrypt hash).
- [x] **Storage -> New bucket** -> name `uploads` -> turn **Public bucket ON**.
- [x] **Project Settings -> API Keys** -> copy *Project URL* (`SUPABASE_URL`) and the *Secret key* (`SUPABASE_SERVICE_ROLE_KEY`).

## 2. Gotenberg service (Render) — CURRENT STEP
- [ ] Commit and push your repo (including the `gotenberg/` folder) to GitHub.
- [ ] On Render: **New +** -> **Web Service** -> select your GitHub repo.
- [ ] Set **Root Directory**: `gotenberg`
- [ ] Set **Runtime**: **Docker**
- [ ] Set **Region**: Singapore, **Instance Type**: Free
- [ ] Add Environment Variable: `PORT=3000`
- [ ] Deploy and copy its URL (e.g. `https://ojt-gotenberg.onrender.com`) -> use this as `GOTENBERG_URL` in Step 3.
> If it crashes with out-of-memory (free = 512 MB, LibreOffice is heavy), upgrade only this service to Starter (~\$7/mo), or run Gotenberg on a laptop via ngrok during survey sessions.

## 3. Main app service (Render)
- [ ] On Render: **New +** -> **Web Service** -> select the same repo
- [ ] Set **Runtime**: **Node**, **Region**: Singapore, **Instance Type**: Free
- [ ] **Build command**: `pnpm install && pnpm build && npm install --prefix server`
- [ ] **Start command**: `node server/index.js`
- [ ] **Health check path** (under Advanced): `/health`
- [ ] Add Environment Variables from [.env.example](.env.example):
  - [ ] `NODE_ENV=production`
  - [ ] `DATABASE_URL`
  - [ ] `JWT_SECRET`
  - [ ] `SUPABASE_URL`
  - [ ] `SUPABASE_SERVICE_ROLE_KEY`
  - [ ] `SUPABASE_BUCKET=uploads`
  - [ ] `GOTENBERG_URL` (from Step 2)
  - [ ] `GMAIL_USER` & `GMAIL_APP_PASSWORD`
  - [ ] `APP_URL` (your main Render URL, e.g. `https://ojttracer.onrender.com`)

## 4. Free-tier behaviour
- Render free services sleep after ~15 min idle; first request takes ~30-60 s (Gotenberg too). Open the site and try a PDF a few minutes before sessions.
- Supabase free projects pause after ~1 week of inactivity.

## 5. Checklist before respondents use it
- [ ] HTTPS works (needed for GPS/camera)
- [ ] Bucket `uploads` exists and is public; upload an avatar and a document, redeploy, confirm they still load
- [ ] Gotenberg PDF generation works from the live site
- [ ] Test login, DTR clock-in on a phone, document upload
- [ ] Rotate any keys that were ever committed
- [ ] Hide unfinished tabs/buttons
- [ ] Export DB backup before data gathering
