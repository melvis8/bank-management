# 🚀 Deployment Guide — Bank Management System on Render

## Architecture Overview

```
Render Web Service (one service, one URL)
├── Express backend      → handles /api/* routes
├── Swagger UI           → /api-docs
├── Health endpoint      → /health
└── React SPA (static)  → / and all other paths
```

**CamerPay callback URL** (already configured, do NOT change):
```
https://bank-management-mz1n.onrender.com/api/payments/webhook
```

---

## Project Structure

```
bank-api-clean/
├── frontend/            ← React + Vite frontend (source)
│   ├── src/
│   ├── package.json
│   └── vite.config.ts   ← dev proxy: /api → localhost:3000
├── src/                 ← Express backend (controllers, routes, services)
├── index.js             ← Server entry — also serves frontend/dist in production
├── package.json         ← Root scripts including "build"
├── render.yaml          ← Render IaC (optional, for Blueprint deploys)
└── .env                 ← Local secrets (never committed)
```

---

## Local Development

### Prerequisites
- Node.js ≥ 18
- npm

### 1. Install backend dependencies
```bash
cd bank-api-clean
npm install
```

### 2. Configure environment
Your `.env` is already configured. It contains:
- `DATABASE_URL` — Neon PostgreSQL connection string
- `JWT_SECRET` — JWT signing key
- `CAMERPAY_TOKEN`, `CAMERPAY_WEBHOOK_SECRET` — Payment gateway credentials
- `API_BASE_URL`, `FRONTEND_URL` — Set to the Render URL

### 3. Start the backend
```bash
npm run dev      # nodemon with hot reload
```
Backend available at: `http://localhost:3000`
- Health check: `http://localhost:3000/health`
- Swagger docs: `http://localhost:3000/api-docs`

### 4. Start the frontend (separate terminal)
```bash
cd frontend
npm install
npm run dev
```
Frontend available at: `http://localhost:5173`

The Vite dev server proxies all `/api/*` calls to `http://localhost:3000` automatically.

### 5. (Optional) Seed the database
```bash
npm run seed          # 3 demo users
npm run seed:rich     # larger mock dataset
```

Demo accounts after seeding:
| Email | Password | Role |
|-------|----------|------|
| `admin@bms.com` | `Admin123` | Admin |
| `john.doe@email.com` | `User123` | User |
| `alice.smith@email.com` | `User123` | User |

---

## Production Build (Local Test)

Build the frontend and start the unified server:
```bash
# From bank-api-clean/
npm run build       # installs frontend deps + runs vite build
npm start           # starts Express (serves API + frontend/dist)
```
Open `http://localhost:3000` — you should see the React app.

---

## Deploying to Render

### Option A — Manual Dashboard Setup (Recommended for first deploy)

#### Step 1: Push to GitHub
```bash
git add .
git commit -m "feat: unified frontend + backend deploy"
git push origin main
```

> **Important:** Make sure `frontend/` is committed. The `bank-management-frontend-main/` duplicate folder is no longer needed and can be deleted from git history if desired.

#### Step 2: Create a Web Service on Render

1. Go to [render.com](https://render.com) → **New** → **Web Service**
2. Connect your GitHub repository
3. Configure:
   | Setting | Value |
   |---------|-------|
   | **Name** | `bank-management-api` |
   | **Region** | Oregon (or closest to your users) |
   | **Branch** | `main` |
   | **Root Directory** | *(leave empty — root of repo)* |
   | **Runtime** | Node |
   | **Build Command** | `npm ci && npm run build` |
   | **Start Command** | `npm start` |
   | **Plan** | Free (or Starter for always-on) |

#### Step 3: Set Environment Variables in Render Dashboard

Go to your service → **Environment** → add each variable:

| Variable | Value | Required |
|----------|-------|----------|
| `NODE_ENV` | `production` | ✅ |
| `DATABASE_URL` | `postgresql://neondb_owner:...` | ✅ |
| `JWT_SECRET` | *(your current JWT secret)* | ✅ |
| `API_BASE_URL` | `https://bank-management-mz1n.onrender.com` | ✅ |
| `FRONTEND_URL` | `https://bank-management-mz1n.onrender.com` | ✅ |
| `CAMERPAY_BASE_URL` | `https://camerpay.biz/api` | ✅ |
| `CAMERPAY_TOKEN` | `429\|tjP54Fbtn29jvmQXUUlSTVB2Wmb1QBuzaReZ0xlwa2cde68e` | ✅ |
| `CAMERPAY_WEBHOOK_SECRET` | `5e7ee3c38d53b8c32fce5cf77b2e4845f50660c46dc261f7` | ✅ |
| `CORS_ORIGIN` | `*` | ✅ |
| `PORT` | `10000` | Optional (Render sets this) |
| `REDIS_URL` | *(leave empty — in-memory fallback)* | Optional |

> ⚠️ **REDIS_URL**: Render Redis is a paid add-on. The app gracefully falls back to in-memory rate limiting when Redis is not configured — this is fine for a free tier deploy.

#### Step 4: Deploy

Click **Create Web Service** / **Deploy**. The build will:
1. `npm ci` — install backend dependencies
2. `cd frontend && npm ci` — install frontend dependencies  
3. `cd frontend && npm run build` — build the React app into `frontend/dist/`
4. `npm start` — start Express (serves API + static frontend)

Build time: ~2–4 minutes on first deploy.

#### Step 5: Verify the Deploy

After the deploy succeeds:

```bash
# Health check
curl https://bank-management-mz1n.onrender.com/health

# API info
curl https://bank-management-mz1n.onrender.com/api/info

# Should return 200 {"status":"OK","database":"connected",...}
```

- Open `https://bank-management-mz1n.onrender.com` — React login page loads ✅
- Open `https://bank-management-mz1n.onrender.com/api-docs` — Swagger UI ✅
- Open `https://bank-management-mz1n.onrender.com/payments` — React app handles it (SPA routing) ✅

---

### Option B — Render Blueprint (render.yaml)

The `render.yaml` at the project root defines the service. Once connected to GitHub, Render can auto-deploy using this blueprint:

1. Go to Render Dashboard → **New** → **Blueprint**
2. Connect the repo — Render detects `render.yaml`
3. Fill in the `sync: false` environment variables (secrets) when prompted
4. Deploy

---

## CamerPay Integration Notes

### Webhook URL (Already Configured)
Your CamerPay account's callback URL is:
```
https://bank-management-mz1n.onrender.com/api/payments/webhook
```
**Do not change this** — it matches what's deployed.

### Payment Flow
1. User initiates payment from the React frontend (MTN MoMo or Orange Money)
2. Frontend sends `POST /api/payments/initiate` with `{ account_number, amount, method, phone }`
3. Backend calls CamerPay API: `POST https://camerpay.biz/api/payment/initiate`
4. CamerPay sends a notification to the webhook URL when payment completes/fails
5. Backend updates the account balance and transaction status
6. User's browser is redirected to `FRONTEND_URL/payments` (the payments history page)

### Supported Payment Methods
| User selects | Sent to CamerPay as |
|-------------|---------------------|
| MTN Mobile Money (`momo`) | `mobile_money` |
| Orange Money (`om`) | `orange_money` |

### Testing Payments
Use the Swagger UI at `/api-docs` to test the payment endpoint manually:
```json
POST /api/payments/initiate
{
  "account_number": "your-account-number",
  "amount": 500,
  "method": "momo",
  "phone": "699123456",
  "currency": "XAF"
}
```

---

## Common Issues & Fixes

### Frontend shows blank page after deploy
- Check that `npm run build` succeeded in the Render build logs
- Verify `frontend/dist/index.html` was created
- The SPA catch-all in `index.js` serves this file for all non-API routes

### "Database not ready" errors on startup
- Normal during the first few seconds of startup — the DB connects in the background
- Render's health check polls `/health` — the app starts taking traffic once health check passes

### CamerPay payments return 502
- Verify `CAMERPAY_TOKEN` is set correctly in Render environment vars
- Check Render logs for `[CamerPay] API call failed` errors
- The webhook secret bypass warning means `CAMERPAY_WEBHOOK_SECRET` is missing

### Free tier sleep / cold starts
- Render's free tier sleeps services after 15 minutes of inactivity
- First request after sleep takes ~30 seconds
- Upgrade to the **Starter** plan ($7/month) for always-on uptime

---

## Git: Cleaning Up the Duplicate Backend

The `bank-management-frontend-main/` folder is a legacy duplicate and is no longer needed. Remove it:

```bash
git rm -r bank-management-frontend-main/
git commit -m "chore: remove duplicate backend folder"
git push origin main
```

---

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `NODE_ENV` | ✅ | Set to `production` on Render |
| `PORT` | Auto | Render injects this automatically |
| `DATABASE_URL` | ✅ | Neon PostgreSQL connection string |
| `JWT_SECRET` | ✅ | JWT signing secret (min 32 chars) |
| `API_BASE_URL` | ✅ | Public URL of this service (no trailing slash) |
| `FRONTEND_URL` | ✅ | Same as API_BASE_URL for unified deploy; CamerPay return URL |
| `CORS_ORIGIN` | ✅ | `*` or comma-separated list of allowed origins |
| `CAMERPAY_BASE_URL` | ✅ | `https://camerpay.biz/api` |
| `CAMERPAY_TOKEN` | ✅ | Your CamerPay Bearer token |
| `CAMERPAY_WEBHOOK_SECRET` | ✅ | HMAC secret for webhook signature verification |
| `REDIS_URL` | Optional | Redis for rate-limiting; falls back to in-memory |
