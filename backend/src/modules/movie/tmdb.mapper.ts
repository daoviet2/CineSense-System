import { TMDB_POSTER_SIZE } from '../../config/tmdb.js';
import {
  GenreDto,
  MovieCacheInput,
  MovieSummaryDto,
  PagedResult,
} from './movie.types.js';
import {
  TmdbGenre,
  TmdbMovieDetails,
  TmdbMoviePage,
  TmdbMovieSummary,
} from './tmdb.types.js';

const toPosterUrl = (imageBaseUrl: string, posterPath: string | null): string | null => {
  if (!posterPath) return null;

  const baseUrl = imageBaseUrl.replace(/\/+$/, '');
  const path = posterPath.startsWith('/') ? posterPath : `/${posterPath}`;
  return `${baseUrl}/${TMDB_POSTER_SIZE}${path}`;
};

const toReleaseDate = (releaseDate: string): Date | null =>
  releaseDate === '' ? null : new Date(`${releaseDate}T00:00:00.000Z`);

export const mapTmdbGenre = (genre: TmdbGenre): GenreDto => ({
  id: genre.id,
  name: genre.name,
});

export const mapTmdbMovieToCacheInput = (
  movie: TmdbMovieDetails,
  imageBaseUrl: string
): MovieCacheInput => ({
  tmdbId: movie.id,
  title: movie.title,
  overview: movie.overview ?? '',
  averageRating: movie.vote_average,
  posterUrl: toPosterUrl(imageBaseUrl, movie.poster_path),
  releaseDate: toReleaseDate(movie.release_date),
  genres: movie.genres.map(mapTmdbGenre),
});

export const mapTmdbMovieSummary = (
  movie: TmdbMovieSummary,
  imageBaseUrl: string
): MovieSummaryDto => ({
  tmdbId: movie.id,
  title: movie.title,
  posterUrl: toPosterUrl(imageBaseUrl, movie.poster_path),
  releaseDate: movie.release_date === '' ? null : movie.release_date,
  averageRating: movie.vote_average,
  genreIds: movie.genre_ids,
});

export const mapTmdbMoviePage = (
  page: TmdbMoviePage,
  imageBaseUrl: string
): PagedResult<MovieSummaryDto> => ({
  items: page.results.map((movie) => mapTmdbMovieSummary(movie, imageBaseUrl)),
  page: page.page,
  totalPages: page.total_pages,
  totalResults: page.total_results,
});
