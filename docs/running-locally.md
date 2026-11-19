# Running DANN locally

DANN is five pieces. Every page needs the Node backend, and the backend needs
the Supabase database (`DATABASE_URL` in `backend/.env`). Local and live use
the same database.

| Piece | Folder | Local port | Live |
|---|---|---|---|
| Node backend | `backend/` | 5000 | Render `dann-wsk4` |
| App (dashboard) | `client/` | 5173 | Vercel `dannclient` |
| Marketing site + owner login | `frontend/landing-page/` | 5174 | Vercel `dannbusiness` |
| Insights / OCR / chatbot | `agents/` | 8000 | Render `dann-agents` |
| Action chat agent | `agent-actions/` | 8001 | Render `dann-agent-actions` |

## Step by step (PowerShell, from the repo root)

1. Backend. The first boot takes about 25 seconds while it checks the
   tables on Supabase.

   ```powershell
   cd backend
   npm install
   npm start
   ```

2. App and landing page (two terminals):

   ```powershell
   cd client;                npm install; npm run dev    # http://localhost:5173/dashboard/
   cd frontend/landing-page; npm install; npm run dev    # http://localhost:5174
   ```

   Open **http://localhost:5174** and sign in there. `/dashboard` is proxied to the client.

3. Optional AI services (two terminals):

   ```powershell
   cd agents
   .\venv\Scripts\Activate.ps1
   $env:BACKEND_API_URL = "http://localhost:5000"
   uvicorn app:app --port 8000

   cd agent-actions
   .\venv\Scripts\Activate.ps1
   uvicorn app:app --reload --port 8001
   ```

   `client/.env.local` points the app at these local ports.

## If nothing works: check the database first

In Nov 2026 the free Supabase project paused, so the backend could not boot
and every page failed, both locally and live. The symptoms:

- The backend log shows `tenant/user ... not found`, or
- `https://dann-wsk4.onrender.com/api/health` never answers.

Fix it by restoring the project in the Supabase dashboard. If the connection
string changes, update `DATABASE_URL` in `backend/.env` and in Render's
environment, then redeploy. Free projects pause after about a week without
use: upgrade the project, or make sure something uses it regularly.
