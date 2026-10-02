# CET333 Smart Building Monitoring System

A single-student web prototype for the University of Sunderland CET333 Product Development module. It uses simulated building data and does not connect to real IoT hardware.

## Phase 1 features

- Responsive React interface and navigation
- Dashboard overview for equipment and environmental readings
- Administrator login protected by a JSON Web Token
- Express API with validation, security headers and error handling
- SQLite schema for users, buildings, equipment, sensor readings and maintenance records
- Seed data for demonstrating the prototype

## Run locally

1. Install Node.js 22.5 or later (the project uses Node's built-in SQLite support).
2. Copy `.env.example` to `.env` and replace `JWT_SECRET`.
3. Run `npm install` from this folder.
4. Run `npm run dev`.
5. Open `http://localhost:5173`.

The development account uses the `ADMIN_EMAIL` and `ADMIN_PASSWORD` values. If they are not set, the local defaults shown in `.env.example` are used. Change them before any deployment.

## Main folders

```text
client/                 React frontend
  src/components/       Reusable interface components
  src/context/          Authentication state
  src/pages/            Routed pages
server/                 Express backend
  src/config/           Database connection and setup
  src/middleware/       Authentication and error handling
  src/routes/           API endpoints
  src/sql/              SQLite schema
  data/                 Local database (created on first run)
```

## API foundation

- `GET /api/health` – service status
- `POST /api/auth/login` – administrator login
- `GET /api/auth/me` – validate the current administrator
- `GET /api/dashboard/summary` – protected dashboard data

Later phases can add CRUD endpoints for equipment, sensor readings, maintenance requests and historical records using the existing schema.
