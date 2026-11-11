import { prisma } from '../../src/config/db.js';
import { createWatchlistRepository } from '../../src/modules/watchlist/watchlist.repository.js';

const watchlistRepo = createWatchlistRepository(prisma);

async function createTestUser(email: string, name: string) {
  return prisma.user.create({
    data: {
      email,
      name,
      passwordHash: 'dummy-password-hash',
    },
  });
}

async function createTestMovie(
  tmdbId: number,
  title: string,
  genreIds: number[] = [28, 878]
) {
  for (const id of genreIds) {
    await prisma.genre.upsert({
      where: { id },
      create: { id, name: `Genre ${id}` },
      update: {},
    });
  }

  const movie = await prisma.movie.create({
    data: {
      tmdbId,
      title,
      overview: 'Test movie overview',
      averageRating: 8.5,
      posterUrl: '/test-poster.jpg',
      releaseDate: new Date('2020-01-01T00:00:00.000Z'),
    },
  });

  await prisma.movieGenre.createMany({
    data: genreIds.map((genreId) => ({
      movieId: movie.id,
      genreId,
    })),
  });

  return movie;
}

describe('watchlist repository integration', () => {
  it('adds a new movie to watchlist with movie summary and genreIds', async () => {
    const user = await createTestUser('user1@cinesense.test', 'User One');
    const movie = await createTestMovie(900001, 'Inception', [28, 878]);

    const result = await watchlistRepo.add(user.id, movie.id);

    expect(result.created).toBe(true);
    expect(result.item.addedAt).toBeInstanceOf(Date);
    expect(result.item.movie).toEqual({
      tmdbId: 900001,
      title: 'Inception',
      posterUrl: '/test-poster.jpg',
      releaseDate: '2020-01-01',
      averageRating: 8.5,
      genreIds: [28, 878],
    });

    // Verify userId is not exposed on public DTO
    expect(result.item).not.toHaveProperty('userId');

    const count = await prisma.watchlist.count({
      where: { userId: user.id, movieId: movie.id },
    });
    expect(count).toBe(1);
  });

  it('idempotent add: adding again returns created: false without error (Decision D28)', async () => {
    const user = await createTestUser('user2@cinesense.test', 'User Two');
    const movie = await createTestMovie(900002, 'Interstellar', [878]);

    const first = await watchlistRepo.add(user.id, movie.id);
    const second = await watchlistRepo.add(user.id, movie.id);

    expect(first.created).toBe(true);
    expect(second.created).toBe(false);
    expect(second.item.movie.tmdbId).toBe(900002);
    expect(second.item.addedAt).toEqual(first.item.addedAt);

    const count = await prisma.watchlist.count({
      where: { userId: user.id, movieId: movie.id },
    });
    expect(count).toBe(1);
  });

  it('handles 5 concurrent add calls gracefully without error', async () => {
    const user = await createTestUser('user3@cinesense.test', 'User Three');
    const movie = await createTestMovie(900003, 'The Dark Knight', [28]);

    const results = await Promise.all([
      watchlistRepo.add(user.id, movie.id),
      watchlistRepo.add(user.id, movie.id),
      watchlistRepo.add(user.id, movie.id),
      watchlistRepo.add(user.id, movie.id),
      watchlistRepo.add(user.id, movie.id),
    ]);

    const createdCount = results.filter((r) => r.created).length;
    const dedupedCount = results.filter((r) => !r.created).length;

    expect(createdCount).toBe(1);
    expect(dedupedCount).toBe(4);

    const count = await prisma.watchlist.count({
      where: { userId: user.id, movieId: movie.id },
    });
    expect(count).toBe(1);
  });

  it('remove returns true when item existed and false when it did not', async () => {
    const userA = await createTestUser('user4a@cinesense.test', 'User 4A');
    const userB = await createTestUser('user4b@cinesense.test', 'User 4B');
    const movie = await createTestMovie(900004, 'Memento', [9648]);

    await watchlistRepo.add(userA.id, movie.id);

    // User B trying to remove movie from User A's watchlist -> false
    const removedWrongUser = await watchlistRepo.remove(userB.id, movie.id);
    expect(removedWrongUser).toBe(false);

    // User A removing their movie -> true
    const removedUserA = await watchlistRepo.remove(userA.id, movie.id);
    expect(removedUserA).toBe(true);

    // Removing again -> false
    const removedAgain = await watchlistRepo.remove(userA.id, movie.id);
    expect(removedAgain).toBe(false);

    const count = await prisma.watchlist.count({
      where: { userId: userA.id, movieId: movie.id },
    });
    expect(count).toBe(0);
  });

  it('find returns item when in watchlist and null when absent', async () => {
    const user = await createTestUser('user5@cinesense.test', 'User Five');
    const movie = await createTestMovie(900005, 'Dunkirk', [10752]);

    const beforeAdd = await watchlistRepo.find(user.id, movie.id);
    expect(beforeAdd).toBeNull();

    await watchlistRepo.add(user.id, movie.id);

    const afterAdd = await watchlistRepo.find(user.id, movie.id);
    expect(afterAdd).not.toBeNull();
    expect(afterAdd?.movie.tmdbId).toBe(900005);
    expect(afterAdd?.movie.genreIds).toEqual([10752]);
  });

  it('listByUser returns paged items ordered addedAt DESC with genres', async () => {
    const user = await createTestUser('user6@cinesense.test', 'User Six');
    const movie1 = await createTestMovie(900006, 'Oppenheimer', [18]);
    const movie2 = await createTestMovie(900007, 'Tenet', [28, 878]);
    const movie3 = await createTestMovie(900008, 'Prestige', [9648]);

    await watchlistRepo.add(user.id, movie1.id);
    // slight delay to enforce distinct addedAt ordering
    await new Promise((resolve) => setTimeout(resolve, 50));
    await watchlistRepo.add(user.id, movie2.id);
    await new Promise((resolve) => setTimeout(resolve, 50));
    await watchlistRepo.add(user.id, movie3.id);

    // Page 1 (pageSize = 2) -> latest added first (Prestige, Tenet)
    const page1 = await watchlistRepo.listByUser(user.id, 1, 2);
    expect(page1.page).toBe(1);
    expect(page1.totalPages).toBe(2);
    expect(page1.totalResults).toBe(3);
    expect(page1.items).toHaveLength(2);
    expect(page1.items[0].movie.tmdbId).toBe(900008);
    expect(page1.items[1].movie.tmdbId).toBe(900007);

    // Page 2 (pageSize = 2) -> oldest added (Oppenheimer)
    const page2 = await watchlistRepo.listByUser(user.id, 2, 2);
    expect(page2.page).toBe(2);
    expect(page2.items).toHaveLength(1);
    expect(page2.items[0].movie.tmdbId).toBe(900006);

    // Page 3 (out of bounds) -> empty items
    const page3 = await watchlistRepo.listByUser(user.id, 3, 2);
    expect(page3.items).toEqual([]);
  });
});
