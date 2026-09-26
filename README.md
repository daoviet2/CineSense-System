# CineSense

Movie recommendation app built as a monorepo. The approved stack is Next.js for the frontend, Node.js/Express for the backend, PostgreSQL with Prisma, and TMDB as the movie metadata source. The recommendation approach is a hybrid score combining genre match, similarity, average rating, and recency.

## Repository layout

- `frontend/`: Next.js application.
- `backend/`: Express API and Prisma data layer.
- `docs/`: project plan, architecture, database schema, and user flows.
- `recommendation-service/`: optional future Python/FastAPI service; not part of the initial scaffold.

The current work is limited to Phase 0 preparation. Business features and recommendation logic have not been implemented.

## Project documents

- [Project plan](docs/KE_HOACH_DU_AN.md)
- [Architecture](docs/CAU_TRUC_DU_AN.md)
- [Database schema](docs/DATABASE_SCHEMA.md)
- [User flows](docs/LUONG_NGUOI_DUNG.md)

Environment and container setup will be documented here as their Phase 0 features are completed.