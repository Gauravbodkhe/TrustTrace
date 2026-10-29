# TrustTrace Deployment Guide

TrustTrace supports local standalone operation, Dockerized orchestration, and cloud hosting via Vercel (Frontend), FastAPI application servers (Backend), and Supabase / PostgreSQL (Database).

---

## 1. Local Development (Zero Credentials Mode)

No Docker or external services required.

### Prerequisites
- Python 3.11+
- Node.js 20+ & npm

### Backend Setup
```powershell
cd backend
python -m pip install -r requirements.txt
Copy-Item .env.example .env
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

### Frontend Setup
```powershell
cd frontend
npm install
npm run dev
```

The frontend will run at `http://localhost:5173` and automatically proxy API calls to `http://localhost:8000`.

---

## 2. Docker & Docker Compose Deployment

To run both services in containers with local persistent storage:

```powershell
docker-compose up --build -d
```

### `docker-compose.yml`
```yaml
version: '3.8'

services:
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    ports:
      - "8000:8000"
    environment:
      - APP_ENV=production
      - DATABASE_URL=sqlite+aiosqlite:///./trusttrace.db
      - FRONTEND_URL=http://localhost:5173
    volumes:
      - backend-data:/app/data

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    ports:
      - "5173:80"
    depends_on:
      - backend

volumes:
  backend-data:
```

---

## 3. Production Cloud Deployment

### 3.1 Frontend: Vercel / Netlify / Cloudflare Pages
- Root Directory: `frontend`
- Build Command: `npm run build`
- Output Directory: `dist`
- Environment Variables:
  - `VITE_API_URL`: `https://api.yourtrusttrace.domain.com`

### 3.2 Backend: Render / Railway / Fly.io / AWS ECS
- Build Command: `pip install -r requirements.txt`
- Start Command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- Environment Variables:
  - `APP_ENV`: `production`
  - `DATABASE_URL`: `postgresql+asyncpg://postgres:[PASSWORD]@[HOST]:5432/postgres` (Supabase or managed Postgres)
  - `FRONTEND_URL`: `https://trusttrace.yourdomain.com`
  - `GOOGLE_API_KEY`: Optional Gemini API key for hybrid agent planning.

### 3.3 Supabase Database
1. Provision a free PostgreSQL project at `supabase.com`.
2. Grab the connection string URI.
3. Configure `DATABASE_URL` with `postgresql+asyncpg://...`.
4. Tables will be automatically created on startup via SQLAlchemy ORM.
