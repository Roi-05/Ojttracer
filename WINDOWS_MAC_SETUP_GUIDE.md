# 💻 Windows & Mac Setup Guide (No WSL Required)

If you want to run the OJT Tracer platform on a regular Windows or Mac machine natively (without using WSL or Linux), follow these steps.

---

## 1. Prerequisites

Before you begin, you must install these three tools on your computer:

1. **Node.js (v20 or higher)**
   - Download from: [nodejs.org](https://nodejs.org/)
   - *This runs the backend and frontend.*
2. **Git**
   - Download from: [git-scm.com](https://git-scm.com/downloads)
3. **Docker Desktop**
   - Download from: [docker.com/products/docker-desktop](https://www.docker.com/products/docker-desktop/)
   - *This runs the PostgreSQL database easily without complex local setups.*

> **Important for Windows Users:** Make sure Docker Desktop is fully running (you should see the whale icon in your system tray) before proceeding.

---

## 2. Clone the Project & Install Dependencies

Open your terminal (Command Prompt or PowerShell on Windows, Terminal on Mac).

```bash
# 1. Clone the repository
git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git
cd YOUR_REPO

# 2. Install Frontend Dependencies
npm install

# 3. Install Backend Dependencies
cd server
npm install
cd ..
```

---

## 3. Start the Database (Docker)

Make sure Docker Desktop is open and running. Run this command in the root folder of the project:

```bash
# This starts the database in the background
docker-compose up -d
```
*(If you don't have `docker-compose.yml`, you can run the raw Docker command below):*
```bash
docker run -d --name ojttracer-postgres -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgrespassword -e POSTGRES_DB=ojttracer -p 5432:5432 -v pgdata:/var/lib/postgresql/data postgres:15
```

### Initialize the Database Tables
You need to create the tables in your empty database.

**On Windows (PowerShell or CMD):**
```cmd
docker exec -i ojttracer-postgres psql -U postgres -d ojttracer < schema.sql
```

**On Mac:**
```bash
docker exec -i ojttracer-postgres psql -U postgres -d ojttracer < schema.sql
```

---

## 4. Run the Application

You will need to open **two separate terminal windows**.

### Terminal 1: Start the Backend
```bash
cd server
npm start
```
*(You should see a message saying "Server listening on port 3000")*

### Terminal 2: Start the Frontend
```bash
# Make sure you are in the root folder (Ojttracer)
npm run dev
```

---

## 5. View the App

Open your web browser and go to:
**http://localhost:5173**

Everything is now running natively on your machine!

---

## Troubleshooting

- **"Command not found: npm"**: You didn't install Node.js correctly. Restart your computer after installing it.
- **"Cannot connect to the Docker daemon"**: Docker Desktop is not running. Open the Docker Desktop app and wait for the engine to start.
- **"Port 5432 is already in use"**: You already have another PostgreSQL database running on your computer. You must stop it before Docker can use that port.
