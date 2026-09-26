# CineSense

CineSense is a movie recommendation app scaffold. The approved stack is Next.js, Node.js/Express, PostgreSQL with Prisma, and TMDB for movie metadata. The planned recommender uses genre match, similarity, average rating, and recency. Business features and recommendation logic are outside the current Phase 0 scope.

## Repository layout

- `frontend/`: Next.js application.
- `backend/`: Express API scaffold and Prisma schema/migrations.
- `docs/`: project plan, architecture, database schema, and user flows.
- `recommendation-service/`: optional future Python/FastAPI service; currently disabled.
- `docker-compose.yml`: local PostgreSQL, backend, and frontend services.

## Prerequisites

- Docker Desktop with Docker Compose enabled.
- PowerShell for the commands below on Windows, or a shell with Docker Compose.

## Local development

From the repository root, create local environment files from the checked-in templates:

```powershell
Copy-Item backend/.env.example backend/.env
Copy-Item frontend/.env.local.example frontend/.env.local
```

Set a valid TMDB API key in `backend/.env` if you need TMDB access. Keep local `.env` files out of Git; only the example templates are committed. Compose uses development defaults for PostgreSQL and the internal backend connection.

Validate the Compose configuration:

```powershell
docker compose config --quiet
```

Start the stack from PowerShell. If host port 3000 is already in use, select another port such as 3002:

```powershell
$env:FRONTEND_PORT = "3002"
docker compose up --build -d
```

Apply the initial Prisma migration and validate the schema in the backend container:

```powershell
docker compose exec backend npx prisma migrate deploy
docker compose exec backend npx prisma validate
docker compose exec backend npx prisma migrate status
```

Open the services:

- Frontend: `http://localhost:3002` (or the selected `FRONTEND_PORT`).
- Backend health check: `http://localhost:4001/health`.
- PostgreSQL: `localhost:5432`.

Check container status and stop the stack:

```powershell
docker compose ps
docker compose down
```

Compose keeps PostgreSQL data in the `postgres_data` volume when the stack is stopped.

## Project documents

- [Project plan](docs/KE_HOACH_DU_AN.md)
- [Architecture](docs/CAU_TRUC_DU_AN.md)
- [Database schema](docs/DATABASE_SCHEMA.md)
- [User flows](docs/LUONG_NGUOI_DUNG.md)

## Current scope

Phase 0 prepares the monorepo, local Docker environment, environment templates, TMDB configuration, and Prisma schema. Authentication, movie features, and recommendation logic have not been implemented.
