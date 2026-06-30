# YT Audio Backend

This small server extracts the direct audio stream URL from any YouTube video/playlist.
The mobile app calls this server to get a playable audio URL.

## Why this is needed

YouTube doesn't let you grab raw audio URLs directly from a phone app — this backend
does that resolution step using `ytdl-core`, so the app just gets back a plain `.mp4`/`.webm`
audio link it can play with the native Android audio player (which supports background
playback, screen off, app closed).

## Deploy for free (pick one)

### Option A — Render.com (recommended, easiest)
1. Go to https://render.com → Sign up free
2. Click **New** → **Web Service**
3. Choose **Public Git Repository** and paste this code's repo URL
   (or use "Deploy without Git" → drag this `backend` folder as a zip if offered)
4. Settings:
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Plan:** Free
5. Click **Create Web Service**
6. Wait ~2 minutes — you'll get a URL like `https://ytaudio-backend.onrender.com`
7. **Copy that URL** — you'll paste it into the app config (see app README)

⚠️ Free tier sleeps after 15 min of inactivity — first request after sleep takes ~30s to wake up.

### Option B — Railway.app
1. Go to https://railway.app → Sign up free
2. New Project → Deploy from local folder (use Railway CLI) or GitHub repo
3. It auto-detects Node.js and deploys
4. Copy the generated public URL

### Option C — Run on your own PC (for testing only, not 24/7)
```bash
cd backend
npm install
npm start
```
Server runs at `http://localhost:3000` — only works while your PC is on and only
reachable by devices on the same network (use your PC's local IP, not localhost,
from the phone).

## Test it's working

Once deployed, visit in browser:
```
https://your-backend-url.onrender.com/health
```
Should show: `{"status":"ok"}`

Then test resolving a video:
```
https://your-backend-url.onrender.com/resolve?url=https://www.youtube.com/watch?v=dQw4w9WgXcQ
```
Should return JSON with `audioUrl`, `title`, etc.

## Important: paste your backend URL into the app

After deploying, open `app/src/config.ts` in the mobile app project and replace:
```ts
export const BACKEND_URL = 'https://your-backend-url.onrender.com';
```
with your real deployed URL. Then rebuild the app.
