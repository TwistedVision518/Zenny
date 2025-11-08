# Deploying Zenny (Next.js frontend) to Netlify

This project has a separate Flask backend. The recommended approach is:
- Deploy the frontend (this Next.js app) to Netlify
- Deploy the Flask backend to a separate host (Render, Railway, Fly.io, Azure, etc.)
- Set `NEXT_PUBLIC_API_URL` on Netlify to point to the backend

## 1) Prepare the backend URL
Deploy your Flask app (`backend/app.py`) somewhere public (Render is quick):
- Create a new Web Service on Render
- Build command: `pip install -r requirements.txt` (create one if needed)
- Start command: `gunicorn app:app --bind 0.0.0.0:$PORT` (update if your app uses a different entrypoint)
- Ensure CORS is enabled for your Netlify domain
- Note the public URL, e.g. `https://zenny-backend.onrender.com`

## 2) Configure the frontend for external API
The frontend reads `NEXT_PUBLIC_API_URL` at runtime.

- For local dev: create `.env.local` in the project root with:

```
NEXT_PUBLIC_API_URL=http://127.0.0.1:5000
```

- For production on Netlify: set this variable in the Netlify UI (see below).

## 3) Add Netlify config
`netlify.toml` (already added) uses the Next.js plugin.
If you prefer proxying `/api/*` routes through Netlify, uncomment the `[[redirects]]` block and set your backend URL.

## 4) Push to GitHub
- Initialize a git repo if you haven't:

```
git init
git add .
git commit -m "Initial"
```

- Create a new repo on GitHub and push:

```
git remote add origin https://github.com/<your-username>/zenny.git
git branch -M main
git push -u origin main
```

## 5) Deploy to Netlify
- Go to Netlify Dashboard → Add new site → Import from GitHub
- Pick your repository
- Build settings:
  - Build command: `npm run build`
  - Publish directory: `.next`
  - Node version: use Netlify default or set in UI if needed
- Environment variables:
  - Add `NEXT_PUBLIC_API_URL=https://zenny-backend.onrender.com` (replace with your real backend URL)
- Click Deploy

## 6) Post-deploy checks
- Visit the deployed URL
- Open browser devtools → Network tab → verify API calls go to your backend domain and succeed (status 200)
- If you proxy via `[[redirects]]`, confirm the rewrite works and CORS is properly configured on the backend

## 7) Custom domain & HTTPS
- In Netlify, add your custom domain and enable HTTPS

## 8) Troubleshooting
- White screen or build fail: check Netlify build logs
- 404 on API: ensure `NEXT_PUBLIC_API_URL` is set and points to a live backend
- CORS errors: enable CORS on Flask (`flask-cors`), allow your Netlify domain
- Stale env var: trigger a new deploy after changing environment variables
