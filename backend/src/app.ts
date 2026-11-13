import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { Application, Request, Response, NextFunction, RequestHandler } from 'express';
import helmet from 'helmet';
import { env } from './config/env.js';
import { AppError, errorHandler } from './middlewares/errorHandler.js';
import {
  createActivityWriteRateLimiter,
  createLoginRateLimiter,
  createMoviesRateLimiter,
  createRegisterRateLimiter,
} from './middlewares/rateLimiter.js';
import { createTmdbClient, ITmdbClient } from './modules/movie/tmdb.client.js';
import { createMovieRepository } from './modules/movie/movie.repository.js';
import { createGenreRepository } from './modules/movie/genre.repository.js';
import { createMovieService, IMovieService } from './modules/movie/movie.service.js';
import { IMovieResolver, MovieEventPublisher } from './modules/movie/movie.types.js';
import { createGenreRouter, createMovieRouter } from './modules/movie/movie.routes.js';
import { createMovieController } from './modules/movie/movie.controller.js';
import { createMovieResolver } from './modules/movie/movie.resolver.js';
import { createAuthRouter } from './modules/auth/auth.routes.js';
import { createUserRouter } from './modules/user/user.routes.js';
import {
  NoopUserActivityEventPublisher,
  UserActivityEventPublisher,
} from './modules/user/userActivity.events.js';
import { createHistoryRepository } from './modules/history/history.repository.js';
import { createHistoryService, IHistoryService } from './modules/history/history.service.js';
import { createHistoryController } from './modules/history/history.controller.js';
import { createHistoryRouter } from './modules/history/history.routes.js';
import { createWatchlistRepository } from './modules/watchlist/watchlist.repository.js';
import { createWatchlistService, IWatchlistService } from './modules/watchlist/watchlist.service.js';
import { createWatchlistController } from './modules/watchlist/watchlist.controller.js';
import { createWatchlistRouter } from './modules/watchlist/watchlist.routes.js';

export interface AppDependencies {
  movieService?: IMovieService;
  tmdbClient?: ITmdbClient;
  eventPublisher?: MovieEventPublisher;
  moviesRateLimiter?: RequestHandler;
  historyService?: IHistoryService;
  watchlistService?: IWatchlistService;
  movieResolver?: IMovieResolver;
  activityPublisher?: UserActivityEventPublisher;
  activityWriteRateLimiter?: RequestHandler;
  watchlistWriteRateLimiter?: RequestHandler;
}

export function createApp(dependencies: AppDependencies = {}): Application {
  const app = express();

  // ── Security headers (Decision D10) ──────────────────────────────────────
  // helmet sets X-Content-Type-Options, X-Frame-Options, HSTS, etc.
  // CORP must be cross-origin: the browser frontend is a different origin
  // (different port) and would otherwise fail credentialed fetch/PATCH.
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    })
  );

  // ── CORS (Decision D10) ───────────────────────────────────────────────────
  // Allow requests only from FRONTEND_ORIGIN; credentials required for
  // httpOnly cookie transport. Never use '*' with credentials.
  app.use(
    cors({
      origin: env.FRONTEND_ORIGIN,
      credentials: true,
    })
  );

  // ── Body / cookie parsing ─────────────────────────────────────────────────
  app.use(express.json());
  app.use(cookieParser());

  // ── Health check (public, no rate limit) ─────────────────────────────────
  app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({ status: 'ok' });
  });

  // ── Auth routes with per-route rate limiters (Decision D10) ──────────────
  // Rate limiters are mounted only on the two auth mutation endpoints.
  // /auth/logout has no limiter (stateless, cheap, idempotent).
  app.use(
    '/auth',
    createAuthRouter({
      loginRateLimiter: createLoginRateLimiter(),
      registerRateLimiter: createRegisterRateLimiter(),
    })
  );

  // ── User profile routes (feat-016, Decision D5) ───────────────────────────
  // All /users routes require authentication (requireAuth applied per-route).
  app.use('/users', createUserRouter());

  // ── Public movie endpoints (feat-029, D14/D16) ────────────────────────────
  const movieRepo = createMovieRepository();
  const genreRepo = createGenreRepository();
  const movieService =
    dependencies.movieService ??
    createMovieService({
      tmdbClient:
        dependencies.tmdbClient ??
        createTmdbClient({
          config: {
            apiKey: env.TMDB_API_KEY,
            baseUrl: env.TMDB_BASE_URL,
            language: env.TMDB_LANGUAGE,
            timeoutMs: env.TMDB_TIMEOUT_MS,
          },
        }),
      movieRepo,
      genreRepo,
      eventPublisher: dependencies.eventPublisher,
      imageBaseUrl: env.TMDB_IMAGE_BASE_URL,
      language: env.TMDB_LANGUAGE,
    });
  const movieController = createMovieController(movieService);
  const moviesRateLimiter = dependencies.moviesRateLimiter ?? createMoviesRateLimiter();
  app.use('/movies', moviesRateLimiter, createMovieRouter(movieController));
  app.use('/genres', moviesRateLimiter, createGenreRouter(movieController));

  // ── History endpoints (feat-040, D26/D30/D34) ────────────────────────────
  const movieResolver =
    dependencies.movieResolver ??
    createMovieResolver({
      movieService,
      movieRepo,
    });
  const historyService =
    dependencies.historyService ??
    createHistoryService({
      historyRepo: createHistoryRepository(),
      movieResolver,
      activityPublisher:
        dependencies.activityPublisher ?? new NoopUserActivityEventPublisher(),
    });
  const historyController = createHistoryController(historyService);
  const activityWriteRateLimiter =
    dependencies.activityWriteRateLimiter ?? createActivityWriteRateLimiter();

  app.use(
    '/history',
    createHistoryRouter({
      controller: historyController,
      writeRateLimiter: activityWriteRateLimiter,
    })
  );

  // Use a separate in-memory counter for Watchlist writes (D34).
  const watchlistService =
    dependencies.watchlistService ??
    createWatchlistService({
      watchlistRepo: createWatchlistRepository(),
      movieResolver,
      activityPublisher:
        dependencies.activityPublisher ?? new NoopUserActivityEventPublisher(),
    });
  app.use(
    '/watchlist',
    createWatchlistRouter({
      controller: createWatchlistController(watchlistService),
      writeRateLimiter:
        dependencies.watchlistWriteRateLimiter ?? createActivityWriteRateLimiter(),
    })
  );

  // ── 404 handler ───────────────────────────────────────────────────────────
  app.use((_req: Request, _res: Response, next: NextFunction) => {
    next(new AppError('Resource not found', 404, 'NOT_FOUND'));
  });

  app.use(errorHandler);

  return app;
}
