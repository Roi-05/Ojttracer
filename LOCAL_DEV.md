# PampangaStateU-Link — Local Development Setup

## Prerequisites

Install these tools on your machine before starting:

| Tool | Install |
|---|---|
| **Node.js 20+** | https://nodejs.org |
| **pnpm** | `npm install -g pnpm` |
| **Supabase CLI** | `npm install -g supabase` |

---

## 1. Clone & Install

```bash
git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git
cd YOUR_REPO

pnpm install
```

---

## 2. Environment Variables

```bash
cp .env.example .env.local
```

Open `.env.local` — the frontend values are already filled in via
`utils/supabase/info.tsx` so **no changes needed** for the React app.

If you want to run edge functions locally (Step 4), fill in
`SUPABASE_SERVICE_ROLE_KEY` from:
> Supabase Dashboard → Project Settings → API → service_role key

---

## 3. Run the React Frontend

```bash
pnpm dev
```

This opens **http://localhost:5173** automatically.

> **Note:** `figma:asset/` image imports will silently resolve to empty
> strings locally — everything else works normally.

---

## 4. Run Edge Functions Locally (Optional)

The backend API lives in `supabase/functions/server/index.tsx`.
To run it locally:

```bash
# One-time: log in and link your project
supabase login
supabase link --project-ref fryvxhnmjietoyfzfblq

# Serve functions locally (needs SUPABASE_SERVICE_ROLE_KEY in .env.local)
supabase functions serve --env-file .env.local
```

The function will be available at:
`http://localhost:54321/functions/v1/make-server-09490c03`

To point the frontend at your local function instead of production,
temporarily change `BASE` in `src/app/lib/api.ts`:
```ts
const BASE = `http://localhost:54321/functions/v1/make-server-09490c03`;
```

---

## 5. Run the SQL Migration (First time only)

If starting with a fresh Supabase project, run the migration in
**Supabase Dashboard → SQL Editor**:

```
supabase/migrations/20260430000000_init_schema.sql
```

Then run the trigger/index block from your chat history.

---

## Project Structure

```
├── index.html                   # Vite HTML entry point
├── src/
│   ├── main.tsx                 # React DOM render entry
│   ├── app/
│   │   ├── App.tsx              # Root component
│   │   ├── routes.tsx           # React Router routes
│   │   ├── contexts/
│   │   │   └── AuthContext.tsx  # Supabase auth state
│   │   ├── lib/
│   │   │   ├── api.ts           # All API calls to edge function
│   │   │   └── supabase.ts      # Supabase client singleton
│   │   ├── pages/               # Dashboard pages per role
│   │   └── components/          # Shared UI components
│   └── styles/                  # Tailwind + theme CSS
├── supabase/
│   ├── config.toml              # Supabase CLI config
│   ├── functions/server/        # Edge function (Deno)
│   └── migrations/              # PostgreSQL schema
├── utils/supabase/info.tsx      # Project ID + anon key
├── vite.config.ts               # Vite config (figma:asset plugin included)
├── tsconfig.json
└── .env.example                 # Copy to .env.local
```

---

## Common Issues

| Problem | Fix |
|---|---|
| `Cannot find module 'react'` | Run `pnpm install` — react is now in dependencies |
| `figma:asset/... not resolved` | Already handled by the `figmaAssetFallback` plugin in vite.config.ts |
| Edge function returns 403 | Make sure the function is deployed in Supabase Dashboard → Edge Functions |
| `pnpm: command not found` | Run `npm install -g pnpm` first |
| TypeScript errors on `import.meta` | Make sure `tsconfig.json` exists (it's included in this repo) |
