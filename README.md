# Blug – Projektstruktur (Backend + Frontend + Databas)

Den här repot är uppdelad så att det är enkelt att se vad som är **backend**, **frontend** och **databas**.

## Struktur

```
.
├── backend/          # REST API (Express)
├── frontend/         # Web-klient (Vite/React)
├── database/         # SQL/migrations + DB-scripts
├── tools/            # Postman, scripts, setup-hjälp
├── docker-compose.yml
├── package.json      # Starta API + Web med ett kommando
└── .vscode/          # VS Code tasks (genvägar)
```

## Snabbstart

### 1) Installera dependencies

```bash
npm run install:all
```

### 2) Starta databasen (Docker)

```bash
docker compose up -d db
```

### 3) Kopiera env

```bash
cp .env.example backend/.env
```

### 4) Kör migrations (om ni använder SQL-filerna)

```bash
npm run db:migrate
```

### 5) Starta backend + frontend

```bash
npm run dev
```

- Frontend: http://localhost:5173
- Backend:  http://localhost:3000 (eller enligt backend/.env)

## VS Code genvägar

- `Ctrl+Shift+B` → välj:
  - **Start Backend (API)**
  - **Start Frontend (Web)**
  - **Start API + Web (together)**
  - **DB Up (Docker)**

## Databas

- Docker Compose startar PostgreSQL med:
  - DB: `blug`
  - User: `blug_app`
  - Password: `blug_app_password`

Ändra detta i `docker-compose.yml` och `backend/.env` vid behov.
