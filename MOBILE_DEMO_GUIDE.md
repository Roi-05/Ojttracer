# 📱 Mobile Geolocation Demo Guide

Because web browsers enforce strict security rules, **GPS geolocation will only work on mobile phones if the website is served over HTTPS**. 

Since we are running the app locally, we use **ngrok** to create a secure, public HTTPS tunnel to our local machine so we can test it on a phone.

Follow these exact steps to start the app for your demo.

---

## 1. Start the Database
Ensure your Docker containers for PostgreSQL are running.
```bash
docker start ojttracer-postgres
```

## 2. Start the Backend Server
Open a terminal in the root of the project and start the Node.js backend.
```bash
cd server
npm start
```
*(Leave this terminal running in the background)*

## 3. Start the Frontend (Vite)
Open a **second** terminal in the root of the project and start the React frontend.
```bash
pnpm run dev
```
*(Leave this terminal running in the background)*

## 4. Start the ngrok Tunnel
Open a **third** terminal and start ngrok, pointing it to the Vite frontend port (5173).
```bash
ngrok http 5173
```
*(Leave this terminal running in the background)*

---

## 5. Connect on your Phone

When you run step 4, ngrok will output a screen in your terminal that looks like this:
```
Session Status                online
Account                       Your Name (Plan: Free)
Forwarding                    https://xyz-123.ngrok-free.app -> http://localhost:5173
```

1. Look for the **Forwarding** URL (e.g., `https://xyz-123.ngrok-free.app`).
2. Open the web browser on your mobile phone (Safari or Chrome).
3. Type in that exact `https://...` URL.
4. **Log in as the HTE Supervisor**, go to the Company Profile, and press **Capture GPS**. Your phone will prompt you for location permissions. Allow it, and you'll get accurate, meter-level GPS tracking!

> ⚠️ **Important Note:** Every time you stop and restart the `ngrok http 5173` command, the URL will change (since you are on the free tier). You will need to type the new URL into your phone.

---

## Why this works (The Architecture)

You only need **one** ngrok tunnel. 
1. Your phone talks to `https://...ngrok-free.app`
2. ngrok forwards it to your `localhost:5173` (Vite)
3. Vite serves the frontend UI.
4. When the frontend makes an API call to `/api/...`, Vite's internal proxy catches it and forwards it securely to the backend on `localhost:3000`.
