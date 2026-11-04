import { prisma } from '../../src/config/db.js';
import { createHistoryRepository } from '../../src/modules/history/history.repository.js';
import { HISTORY_DEDUPE_WINDOW_MS } from '../../src/config/activity.js';

const historyRepo = createHistoryRepository(prisma);

async function createTestUser(email: string, name: string) {
  return prisma.user.create({
    data: {
      email,
      name,
      passwordHash: 'dummy-password-hash',
    },
  });
}

async function createTestMovie(tmdbId: number, title: string, genreIds: number[] = [28, 878]) {
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

describe('history repository integration', () => {
  it('records a new watch history entry with movie summary and genreIds', async () => {
    const user = await createTestUser('user1@cinesense.test', 'User One');
    const movie = await createTestMovie(800001, 'The Matrix', [28, 878]);
    const now = new Date('2026-10-27T10:00:00.000Z');

    const result = await historyRepo.recordIfNotRecent(
      user.id,
      movie.id,
      now,
      HISTORY_DEDUPE_WINDOW_MS
    );

    expect(result.created).toBe(true);
    expect(result.entry).toEqual({
      id: expect.any(String),
      watchedAt: now,
      movie: {
        tmdbId: 800001,
        title: 'The Matrix',
        posterUrl: '/test-poster.jpg',
        releaseDate: '2020-01-01',
        averageRating: 8.5,
        genreIds: [28, 878],
      },
    });

    // Verify userId is not exposed in public DTO
    expect(result.entry).not.toHaveProperty('userId');

    const count = await prisma.watchHistory.count({
      where: { userId: user.id, movieId: movie.id },
    });
    expect(count).toBe(1);
  });

  it('deduplicates repeat view within the dedupe window (created: false)', async () => {
    const user = await createTestUser('user2@cinesense.test', 'User Two');
    const movie = await createTestMovie(800002, 'Inception', [28]);
    const firstTime = new Date('2026-10-27T10:00:00.000Z');
    const repeatTime = new Date('2026-10-27T10:15:00.000Z'); // +15 min (within 30m)

    const first = await historyRepo.recordIfNotRecent(
      user.id,
      movie.id,
      firstTime,
      HISTORY_DEDUPE_WINDOW_MS
    );
    const second = await historyRepo.recordIfNotRecent(
      user.id,
      movie.id,
      repeatTime,
      HISTORY_DEDUPE_WINDOW_MS
    );

    expect(first.created).toBe(true);
    expect(second.created).toBe(false);
    expect(second.entry.id).toBe(first.entry.id);
    expect(second.entry.watchedAt.getTime()).toBe(firstTime.getTime());

    const count = await prisma.watchHistory.count({
      where: { userId: user.id, movieId: movie.id },
    });
    expect(count).toBe(1);
  });

  it('records a new entry when view occurs outside the dedupe window', async () => {
    const user = await createTestUser('user3@cinesense.test', 'User Three');
    const movie = await createTestMovie(800003, 'Interstellar', [878]);
    const firstTime = new Date('2026-10-27T10:00:00.000Z');
    const laterTime = new Date('2026-10-27T10:35:00.000Z'); // +35 min (outside 30m window)

    const first = await historyRepo.recordIfNotRecent(
      user.id,
      movie.id,
      firstTime,
      HISTORY_DEDUPE_WINDOW_MS
    );
    const second = await historyRepo.recordIfNotRecent(
      user.id,
      movie.id,
      laterTime,
      HISTORY_DEDUPE_WINDOW_MS
    );

    expect(first.created).toBe(true);
    expect(second.created).toBe(true);
    expect(second.entry.id).not.toBe(first.entry.id);
    expect(second.entry.watchedAt.getTime()).toBe(laterTime.getTime());

    const count = await prisma.watchHistory.count({
      where: { userId: user.id, movieId: movie.id },
    });
    expect(count).toBe(2);
  });

  it('handles 5 concurrent record calls for the same (userId, movieId) with exactly 1 insert', async () => {
    const user = await createTestUser('user4@cinesense.test', 'User Four');
    const movie = await createTestMovie(800004, 'Gladiator', [28]);
    const now = new Date('2026-10-27T12:00:00.000Z');

    const results = await Promise.all(
      Array.from({ length: 5 }, () =>
        historyRepo.recordIfNotRecent(user.id, movie.id, now, HISTORY_DEDUPE_WINDOW_MS)
      )
    );

    const createdList = results.filter((r) => r.created);
    const existingList = results.filter((r) => !r.created);

    expect(createdList).toHaveLength(1);
    expect(existingList).toHaveLength(4);

    // All return the exact same entry ID
    const entryIds = new Set(results.map((r) => r.entry.id));
    expect(entryIds.size).toBe(1);

    const count = await prisma.watchHistory.count({
      where: { userId: user.id, movieId: movie.id },
    });
    expect(count).toBe(1);
  });

  it('lists history ordered by watchedAt DESC with pagination, and returns [] when page > totalPages', async () => {
    const user = await createTestUser('user5@cinesense.test', 'User Five');
    const movieA = await createTestMovie(800005, 'Movie A', [18]);
    const movieB = await createTestMovie(800006, 'Movie B', [35]);

    // Create 25 entries with distinct timestamps
    const baseTime = new Date('2026-10-27T00:00:00.000Z').getTime();
    for (let i = 0; i < 25; i++) {
      await prisma.watchHistory.create({
        data: {
          userId: user.id,
          movieId: i % 2 === 0 ? movieA.id : movieB.id,
          watchedAt: new Date(baseTime + i * 60_000), // +1 min each
        },
      });
    }

    // Page 1 (pageSize 20)
    const page1 = await historyRepo.listByUser(user.id, 1, 20);
    expect(page1.page).toBe(1);
    expect(page1.totalPages).toBe(2);
    expect(page1.totalResults).toBe(25);
    expect(page1.items).toHaveLength(20);

    // Verified ordered by watchedAt DESC: first item is latest (index 24)
    expect(page1.items[0].watchedAt.getTime()).toBe(baseTime + 24 * 60_000);
    expect(page1.items[0].movie.genreIds).toBeDefined();

    // Page 2 (remaining 5)
    const page2 = await historyRepo.listByUser(user.id, 2, 20);
    expect(page2.page).toBe(2);
    expect(page2.totalPages).toBe(2);
    expect(page2.totalResults).toBe(25);
    expect(page2.items).toHaveLength(5);
    expect(page2.items[4].watchedAt.getTime()).toBe(baseTime); // oldest

    // Page 3 (exceeds totalPages -> empty items array)
    const page3 = await historyRepo.listByUser(user.id, 3, 20);
    expect(page3.page).toBe(3);
    expect(page3.totalPages).toBe(2);
    expect(page3.totalResults).toBe(25);
    expect(page3.items).toEqual([]);
  });

  it('deleteOne of another user returns false and leaves entry untouched', async () => {
    const userA = await createTestUser('userA@cinesense.test', 'User A');
    const userB = await createTestUser('userB@cinesense.test', 'User B');
    const movie = await createTestMovie(800007, 'Movie C', [28]);

    const entryA = await historyRepo.recordIfNotRecent(
      userA.id,
      movie.id,
      new Date(),
      HISTORY_DEDUPE_WINDOW_MS
    );

    // User B tries to delete User A's entry
    const deletedByB = await historyRepo.deleteOne(userB.id, entryA.entry.id);
    expect(deletedByB).toBe(false);

    // Entry still exists
    const stillExists = await prisma.watchHistory.findUnique({
      where: { id: entryA.entry.id },
    });
    expect(stillExists).not.toBeNull();

    // User A deletes their own entry
    const deletedByA = await historyRepo.deleteOne(userA.id, entryA.entry.id);
    expect(deletedByA).toBe(true);

    const nowDeleted = await prisma.watchHistory.findUnique({
      where: { id: entryA.entry.id },
    });
    expect(nowDeleted).toBeNull();
  });

  it('deleteAll deletes only the entries of the targeted user', async () => {
    const userA = await createTestUser('userA2@cinesense.test', 'User A2');
    const userB = await createTestUser('userB2@cinesense.test', 'User B2');
    const movie = await createTestMovie(800008, 'Movie D', [28]);

    // User A: 3 entries
    for (let i = 0; i < 3; i++) {
      await prisma.watchHistory.create({
        data: {
          userId: userA.id,
          movieId: movie.id,
          watchedAt: new Date(Date.now() + i * 1000),
        },
      });
    }

    // User B: 2 entries
    for (let i = 0; i < 2; i++) {
      await prisma.watchHistory.create({
        data: {
          userId: userB.id,
          movieId: movie.id,
          watchedAt: new Date(Date.now() + i * 1000),
        },
      });
    }

    const deletedCount = await historyRepo.deleteAll(userA.id);
    expect(deletedCount).toBe(3);

    const userACount = await prisma.watchHistory.count({ where: { userId: userA.id } });
    const userBCount = await prisma.watchHistory.count({ where: { userId: userB.id } });

    expect(userACount).toBe(0);
    expect(userBCount).toBe(2);
  });
});

