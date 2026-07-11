# Fleet Dispatch & Route Tracking Platform

Full-stack fleet dispatch and live route tracking for tow and delivery operations across **Calgary & Alberta**.

Live Demo: https://fleet-dispatch-route-tracking-platform-production.up.railway.app/

Note: use the demo info below for login and testing the live demo!

## Stack

- **Next.js 16** (App Router) — full-stack React
- **PostgreSQL** — local database
- **Drizzle ORM** — schema, migrations, type-safe queries
- **Tailwind CSS v4** — UI
- **NextAuth v5** — role-based credentials auth
- **Leaflet + OpenStreetMap** — live fleet map
- **OSRM** — multi-stop route optimization & ETA

## Features

| Feature | Description |
|---------|-------------|
| **Three roles** | Dispatcher, Driver (mobile-first), Customer — RBAC via middleware |
| **Live map** | Moving vehicle markers with polyline interpolation (simulated GPS) |
| **Smart assignment** | Proximity + load scoring to suggest best driver |
| **Route optimization** | OSRM Trip API reorders stops and computes ETA |
| **Status timeline** | State machine: requested → assigned → en route → in progress → completed |
| **Notifications** | SMS/email simulated on status change (logged + persisted; Twilio-ready) |

## Architecture

```
Dispatcher / Driver / Customer (React)
        ↓
Next.js Middleware (RBAC) + NextAuth
        ↓
API Routes + Domain Services
  ├── AssignmentScorer (proximity + load)
  ├── OSRMClient (trip + route)
  ├── LocationInterpolator (polyline simulation)
  ├── JobStatusFSM (valid transitions)
  └── NotificationService (log + DB)
        ↓
Drizzle ORM → PostgreSQL
```

## Assignment Logic

When a dispatcher clicks **Suggest Driver**, each available driver is scored:

```
score = 0.50 × proximityScore + 0.35 × loadScore + 0.15 × availabilityScore

proximityScore  = 1 / (1 + haversineKm(driver, pickup))
loadScore       = 1 / (1 + activeJobCount)
availability    = 1.0 (available) | 0.3 (busy) | 0.0 (offline)
```

**Example (Calgary):** Pickup at Downtown (51.045, -114.072). Driver A is 2 km away with 0 active jobs (available). Driver B is 0.5 km away with 1 active job (busy).

| Driver | Distance | Load | Status | Score |
|--------|----------|------|--------|-------|
| A | 2 km | 0 | available | 0.50×0.33 + 0.35×1.0 + 0.15×1.0 = **0.67** |
| B | 0.5 km | 1 | busy | 0.50×0.67 + 0.35×0.5 + 0.15×0.3 = **0.56** |

Driver A wins despite being farther — zero load and full availability outweigh proximity. This mirrors real dispatch trade-offs: closest isn't always best.

Drivers with `activeJobCount >= 2` or `offline` are excluded.

## Job State Machine

```
requested ──assign──► assigned ──accept──► en_route ──arrive──► in_progress ──complete──► completed
    │                     │
    └──── cancel ─────────┴──── cancel ────► cancelled
```

Every transition writes a `job_status_events` row (timestamp + actor) and triggers notifications.

## Setup

### 1. Prerequisites

- Node.js 20+
- PostgreSQL running locally

### 2. Database

```bash
createdb fleet_dispatch
# or: psql -U postgres -c "CREATE DATABASE fleet_dispatch;"
```

### 3. Environment

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```env
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/fleet_dispatch
AUTH_SECRET=   # openssl rand -base64 32
NEXTAUTH_URL=http://localhost:3000
```

### 4. Install & migrate

```bash
npm install
npm run db:push
npm run db:seed
```

### 5. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Demo Accounts

Password for all: `demo1234`

| Role | Email |
|------|-------|
| Dispatcher | dispatch@fleet.local |
| Driver | driver1@fleet.local … driver5@fleet.local |
| Customer | customer1@fleet.local, customer2@fleet.local |

## Demo Walkthrough

1. Sign in as **dispatch@fleet.local**
2. Open **Dispatcher Dashboard** — see Calgary fleet map and seed job
3. Click **Suggest Driver** on a requested job → review scored rankings → **Assign**
4. Sign out → sign in as **driver1@fleet.local**
5. Tap **En Route** → watch map marker move along OSRM polyline (3s polling)
6. Progress through **In Progress** → **Completed**
7. Open `/track/{jobId}` or sign in as **customer1@fleet.local** to see live tracking + timeline
8. Check terminal for `[NOTIFY]` SMS/email logs

## API Endpoints

| Method | Path | Role | Description |
|--------|------|------|-------------|
| GET/POST | `/api/jobs` | auth | List/create jobs |
| GET/DELETE | `/api/jobs/[id]` | auth | Job detail / cancel |
| POST | `/api/jobs/[id]/assign` | dispatcher | Assign driver |
| POST | `/api/jobs/[id]/status` | driver/dispatcher | Advance status |
| GET | `/api/fleet/locations` | public | Fleet positions (simulates movement) |
| POST | `/api/assignment/suggest` | dispatcher | Ranked driver suggestions |
| POST | `/api/routes/optimize` | auth | OSRM multi-stop optimize |

## Commit Convention

This repo uses [Conventional Commits](https://www.conventionalcommits.org/):

- `feat(scope):` — new feature
- `fix(scope):` — bug fix
- `chore(scope):` — tooling, deps, seed
- `docs:` — README, comments

Examples: `feat(auth): add role-based next-auth with middleware`

## Future Work

- Twilio sandbox for real SMS
- Capacitor mobile shell (like DitchApp/traficapp)
- Real GPS via driver device geolocation API
- Multi-tenant organizations & billing
- WebSocket/SSE for sub-second location updates

## License

MIT — portfolio / demonstration project.
