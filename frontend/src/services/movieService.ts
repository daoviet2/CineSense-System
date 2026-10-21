import { request } from '@/services/apiClient';
import type {
  GenreListResponse,
  MovieDetail,
  MovieListResponse,
  MovieQuery,
} from '@/types/movie';

function toQueryString(query: MovieQuery): string {
  const params = new URLSearchParams();
  params.set('page', String(query.page));

  if (query.genreId !== undefined) {
    params.set('genreId', String(query.genreId));
  } else if (query.q?.trim()) {
    params.set('q', query.q.trim());
  }

  return params.toString();
}

export const movieService = {
  getMovies(query: MovieQuery): Promise<MovieListResponse> {
    return request<MovieListResponse>(`/movies?${toQueryString(query)}`);
  },

  getMovie(tmdbId: number): Promise<MovieDetail> {
    return request<MovieDetail>(`/movies/${tmdbId}`);
  },

  async getGenres() {
    const response = await request<GenreListResponse>('/genres');
    return response.items;
  },
};
