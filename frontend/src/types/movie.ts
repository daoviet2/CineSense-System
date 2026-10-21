export interface Genre {
  id: number;
  name: string;
}

export interface MovieSummary {
  tmdbId: number;
  title: string;
  posterUrl: string | null;
  releaseDate: string | null;
  averageRating: number;
  genreIds: number[];
}

export interface MovieDetail {
  id: string;
  tmdbId: number;
  title: string;
  overview: string;
  averageRating: number;
  posterUrl: string | null;
  releaseDate: string | null;
  genres: Genre[];
}

export interface MovieListResponse {
  items: MovieSummary[];
  page: number;
  totalPages: number;
  totalResults: number;
}

export interface GenreListResponse {
  items: Genre[];
}

export interface MovieQuery {
  page: number;
  q?: string;
  genreId?: number;
}
