import { TMDB_FALLBACK_LANGUAGE, TMDB_MAX_PAGE } from '../../config/tmdb.js';
import { AppError } from '../../middlewares/errorHandler.js';
import { IGenreRepository } from './genre.repository.js';
import { IMovieRepository } from './movie.repository.js';
import {
  GenreDto,
  MovieDetailDto,
  MovieEventPublisher,
  MovieSummaryDto,
  MovieWithGenres,
  PagedResult,
} from './movie.types.js';
import { mapTmdbGenre, mapTmdbMoviePage, mapTmdbMovieToCacheInput } from './tmdb.mapper.js';
import { ITmdbClient } from './tmdb.client.js';

const EMPTY_OVERVIEW = '';
const INVALID_MOVIE_FILTERS_MESSAGE = 'Search query and genre filter cannot be combined';

export class NoopMovieEventPublisher implements MovieEventPublisher {
  async movieCached(_movie: MovieDetailDto): Promise<void> {}
}

export interface MovieListFilters {
  page: number;
  q?: string;
  genreId?: number;
}

export interface MovieServiceDependencies {
  tmdbClient: ITmdbClient;
  movieRepo: IMovieRepository;
  genreRepo: IGenreRepository;
  eventPublisher?: MovieEventPublisher;
  imageBaseUrl: string;
  language: string;
}

export interface IMovieService {
  getMovieDetail(tmdbId: number): Promise<MovieDetailDto>;
  listMovies(filters: MovieListFilters): Promise<PagedResult<MovieSummaryDto>>;
  listGenres(): Promise<GenreDto[]>;
}

function toMovieDetail(movie: MovieWithGenres): MovieDetailDto {
  return {
    id: movie.id,
    tmdbId: movie.tmdbId,
    title: movie.title,
    overview: movie.overview,
    averageRating: movie.averageRating,
    posterUrl: movie.posterUrl,
    releaseDate: movie.releaseDate?.toISOString().slice(0, 10) ?? null,
    genres: movie.genres,
  };
}

export function createMovieService({
  tmdbClient,
  movieRepo,
  genreRepo,
  eventPublisher = new NoopMovieEventPublisher(),
  imageBaseUrl,
  language,
}: MovieServiceDependencies): IMovieService {
  return {
    async getMovieDetail(tmdbId) {
      const cached = await movieRepo.findByTmdbId(tmdbId);
      if (cached) return toMovieDetail(cached);

      const details = await tmdbClient.getMovieDetails(tmdbId);
      let overview = details.overview ?? EMPTY_OVERVIEW;
      if (overview.trim() === EMPTY_OVERVIEW && language !== TMDB_FALLBACK_LANGUAGE) {
        const fallbackDetails = await tmdbClient.getMovieDetails(tmdbId, TMDB_FALLBACK_LANGUAGE);
        overview = fallbackDetails.overview ?? EMPTY_OVERVIEW;
      }

      const input = mapTmdbMovieToCacheInput({ ...details, overview }, imageBaseUrl);
      const { movie, created } = await movieRepo.saveIfAbsent(input);
      const movieDto = toMovieDetail(movie);

      if (created) {
        try {
          await eventPublisher.movieCached(movieDto);
        } catch {
          // Keep event publisher failures visible without logging movie data or upstream details.
          console.error('Movie cache event publishing failed');
        }
      }

      return movieDto;
    },

    async listMovies({ page, q, genreId }) {
      const query = q?.trim() || undefined;
      if (query && genreId !== undefined) {
        throw new AppError(INVALID_MOVIE_FILTERS_MESSAGE, 400, 'VALIDATION_ERROR');
      }

      const tmdbPage = query
        ? await tmdbClient.searchMovies(query, page)
        : genreId !== undefined
          ? await tmdbClient.discoverMoviesByGenre(genreId, page)
          : await tmdbClient.getPopularMovies(page);

      const result = mapTmdbMoviePage(tmdbPage, imageBaseUrl);
      return { ...result, totalPages: Math.min(result.totalPages, TMDB_MAX_PAGE) };
    },

    async listGenres() {
      const genres = await genreRepo.findAll();
      if (genres.length > 0) return genres;

      const tmdbGenres = await tmdbClient.getGenres();
      const mappedGenres = tmdbGenres.genres.map(mapTmdbGenre);
      await genreRepo.upsertMany(mappedGenres);
      return mappedGenres;
    },
  };
}
