import { AppError } from '../../src/middlewares/errorHandler.js';
import { IMovieRepository } from '../../src/modules/movie/movie.repository.js';
import { createMovieResolver } from '../../src/modules/movie/movie.resolver.js';
import { IMovieService } from '../../src/modules/movie/movie.service.js';
import { MovieDetailDto, MovieWithGenres } from '../../src/modules/movie/movie.types.js';

describe('createMovieResolver', () => {
  const fakeMovieDetail: MovieDetailDto = {
    id: 'movie-uuid-1234',
    tmdbId: 603,
    title: 'The Matrix',
    overview: 'A hacker discovers reality',
    averageRating: 8.7,
    posterUrl: 'https://image.tmdb.org/t/p/w500/poster.jpg',
    releaseDate: '1999-03-30',
    genres: [{ id: 28, name: 'Action' }],
  };

  const fakeCachedMovie: MovieWithGenres = {
    id: 'cached-uuid-5678',
    tmdbId: 603,
    title: 'The Matrix',
    overview: 'A hacker discovers reality',
    averageRating: 8.7,
    posterUrl: 'https://image.tmdb.org/t/p/w500/poster.jpg',
    releaseDate: new Date('1999-03-30T00:00:00.000Z'),
    genres: [{ id: 28, name: 'Action' }],
  };

  let mockMovieService: jest.Mocked<Pick<IMovieService, 'getMovieDetail'>>;
  let mockMovieRepo: jest.Mocked<Pick<IMovieRepository, 'findByTmdbId'>>;

  beforeEach(() => {
    mockMovieService = {
      getMovieDetail: jest.fn(),
    };
    mockMovieRepo = {
      findByTmdbId: jest.fn(),
    };
  });

  describe('resolveForWrite', () => {
    it('calls movieService.getMovieDetail and returns movie DB id', async () => {
      mockMovieService.getMovieDetail.mockResolvedValue(fakeMovieDetail);
      const resolver = createMovieResolver({
        movieService: mockMovieService,
        movieRepo: mockMovieRepo,
      });

      const result = await resolver.resolveForWrite(603);

      expect(mockMovieService.getMovieDetail).toHaveBeenCalledTimes(1);
      expect(mockMovieService.getMovieDetail).toHaveBeenCalledWith(603);
      expect(result).toEqual({ id: 'movie-uuid-1234' });
    });

    it('propagates AppError (404, 502, 504) untouched from movieService', async () => {
      const notFoundError = new AppError('Movie not found', 404, 'NOT_FOUND');
      mockMovieService.getMovieDetail.mockRejectedValue(notFoundError);

      const resolver = createMovieResolver({
        movieService: mockMovieService,
        movieRepo: mockMovieRepo,
      });

      await expect(resolver.resolveForWrite(999999)).rejects.toThrow(notFoundError);
      expect(mockMovieService.getMovieDetail).toHaveBeenCalledWith(999999);
    });
  });

  describe('findCachedId', () => {
    it('returns id when movie exists in local cache, without calling movieService', async () => {
      mockMovieRepo.findByTmdbId.mockResolvedValue(fakeCachedMovie);
      const resolver = createMovieResolver({
        movieService: mockMovieService,
        movieRepo: mockMovieRepo,
      });

      const result = await resolver.findCachedId(603);

      expect(mockMovieRepo.findByTmdbId).toHaveBeenCalledTimes(1);
      expect(mockMovieRepo.findByTmdbId).toHaveBeenCalledWith(603);
      expect(mockMovieService.getMovieDetail).not.toHaveBeenCalled();
      expect(result).toBe('cached-uuid-5678');
    });

    it('returns null when movie is not cached in local DB, without calling movieService', async () => {
      mockMovieRepo.findByTmdbId.mockResolvedValue(null);
      const resolver = createMovieResolver({
        movieService: mockMovieService,
        movieRepo: mockMovieRepo,
      });

      const result = await resolver.findCachedId(999999);

      expect(mockMovieRepo.findByTmdbId).toHaveBeenCalledTimes(1);
      expect(mockMovieRepo.findByTmdbId).toHaveBeenCalledWith(999999);
      expect(mockMovieService.getMovieDetail).not.toHaveBeenCalled();
      expect(result).toBeNull();
    });
  });
});
