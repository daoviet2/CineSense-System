export interface GenreDto {
  id: number;
  name: string;
}

export interface MovieSummaryDto {
  tmdbId: number;
  title: string;
  posterUrl: string | null;
  releaseDate: string | null;
  averageRating: number;
  genreIds: number[];
}

export interface MovieDetailDto {
  id: string;
  tmdbId: number;
  title: string;
  overview: string;
  averageRating: number;
  posterUrl: string | null;
  releaseDate: string | null;
  genres: GenreDto[];
}

export interface MovieCacheInput {
  tmdbId: number;
  title: string;
  overview: string;
  averageRating: number;
  posterUrl: string | null;
  releaseDate: Date | null;
  genres: GenreDto[];
}

export interface PagedResult<T> {
  items: T[];
  page: number;
  totalPages: number;
  totalResults: number;
}

export interface MovieEventPublisher {
  movieCached(movie: MovieDetailDto): Promise<void>;
}
