# PampangaStateU-Link — Local Development Setup

## Prerequisites

Install these tools on your machine before starting:

| Tool | Install |
|---|---|
| **Node.js 20+** | https://nodejs.org |
| **pnpm** | `npm install -g pnpm` |
| **Docker** | https://www.docker.com |

---

## 1. Clone & Install

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git
cd YOUR_REPO

# Install frontend dependencies
pnpm install

# Install backend dependencies
cd server
npm install
cd ..
```

---

## 2. Database Setup (Docker)

This project uses a local PostgreSQL database and pgAdmin for visualization.

```bash
# Start the PostgreSQL database
docker run -d --name ojttracer-postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgrespassword \
  -e POSTGRES_DB=ojttracer \
  -p 5432:5432 \
  -v pgdata:/var/lib/postgresql/data \
  postgres:15

# Start pgAdmin (Database UI)
docker run -d --name ojttracer-pgadmin \
  --link ojttracer-postgres:db \
  -e PGADMIN_DEFAULT_EMAIL=admin@admin.com \
  -e PGADMIN_DEFAULT_PASSWORD=admin \
  -p 5050:80 \
  dpage/pgadmin4
```

### Initializing the Schema
Run the following command to apply the database schema to your local Postgres:
```bash
docker exec -i ojttracer-postgres psql -U postgres -d ojttracer < schema.sql
```

---

## 3. Run the Backend

```bash
cd server
node index.js
```
The backend will run on **http://localhost:3000**.

---

## 4. Run the Frontend

```bash
pnpm dev
```
The frontend will run on **http://localhost:5173**.

---

## 5. Database Visualization (pgAdmin)

1. Open **http://localhost:5050** in your browser.
2. Login with `admin@admin.com` / `admin`.
3. Add a new server:
   - **Name:** LocalDB
   - **Host:** `ojttracer-postgres` (or `localhost`)
   - **Username:** `postgres`
   - **Password:** `postgrespassword`
   - **Maintenance DB:** `ojttracer`

---

## Project Structure

```
├── server/                      # Node.js Express Backend
│   ├── index.js                 # API Routes & Express Logic
│   ├── db.js                    # Database connection
│   ├── auth.js                  # JWT & Bcrypt Auth logic
│   └── uploads/                 # Local file storage (DTR photos, etc.)
├── src/                         # React Frontend
│   ├── app/
│   │   ├── contexts/
│   │   │   └── AuthContext.tsx  # Custom JWT auth state
│   │   ├── lib/
│   │   │   └── api.ts           # All API calls to Node.js server
│   │   ├── pages/               # Dashboard pages
│   │   └── components/          # Shared UI components
│   └── styles/                  # Tailwind CSS
├── docker-compose.yml           # Database configuration
├── schema.sql                   # PostgreSQL schema
└── vite.config.ts               # Vite configuration
```
