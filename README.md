# OJT Tracer (PampangaStateU-Link)

A comprehensive OJT Tracer system built with React, Node.js, and PostgreSQL.

## Prerequisites

Ensure you have the following installed on your machine:
- **Node.js 20+** (https://nodejs.org)
- **pnpm** (`npm install -g pnpm`)
- **Docker & Docker Compose** (https://www.docker.com)

## Local Development Setup

### 1. Clone & Install Dependencies

```bash
# Clone the repository
git clone <your-repository-url>
cd Ojttracer

# Install frontend dependencies
pnpm install

# Install backend dependencies
cd server
npm install
cd ..
```

### 2. Database Setup (Docker)

This project uses a local PostgreSQL database and pgAdmin for visualization, managed via Docker Compose.

```bash
# Start Postgres, pgAdmin, and Gotenberg (journal DOCX -> PDF) in the background
docker-compose up -d
```

Journal PDF conversion uses **Gotenberg** (LibreOffice in Docker) at `http://localhost:3001`. The Express API falls back to a local `soffice` install if Gotenberg is not running. Override the URL with `GOTENBERG_URL` if needed.

**Initialize the Schema:**
Run the following command to apply the database schema to your local Postgres container:
```bash
docker exec -i ojttracer-postgres psql -U postgres -d ojttracer < schema.sql
```

### 3. Run the Backend

```bash
cd server
node index.js
```
The backend will run on **http://localhost:3000**.

### 4. Run the Frontend

Open a new terminal window/tab in the project root:
```bash
pnpm dev
```
The frontend will run on **http://localhost:5173**.

## Database Visualization (pgAdmin)

1. Open **http://localhost:5050** in your browser.
2. Login with:
   - **Email:** `admin@admin.com`
   - **Password:** `admin`
3. Add a new server:
   - **Name:** LocalDB
   - **Host:** `ojttracer-postgres` (or `localhost`)
   - **Username:** `postgres`
   - **Password:** `postgrespassword`
   - **Maintenance DB:** `ojttracer`

## Project Structure

```text
├── server/                      # Node.js Express Backend
│   ├── index.js                 # API Routes & Express Logic
│   ├── db.js                    # Database connection
│   ├── auth.js                  # JWT & Bcrypt Auth logic
│   └── uploads/                 # Local file storage (DTR photos, etc.)
├── src/                         # React Frontend
│   ├── app/
│   │   ├── contexts/            # Custom JWT auth state
│   │   ├── lib/                 # API calls to Node.js server
│   │   ├── pages/               # Dashboard pages
│   │   └── components/          # Shared UI components
│   └── styles/                  # Tailwind CSS
├── docker-compose.yml           # Docker services configuration
├── schema.sql                   # PostgreSQL schema
└── vite.config.ts               # Vite configuration
```