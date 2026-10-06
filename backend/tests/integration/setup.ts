import { prisma } from '../../src/config/db.js';

/**
 * Truncate application tables between tests.
 * Child tables first so foreign keys do not block deletes.
 * Never connects to the development database (DATABASE_URL remapped in setTestEnv).
 */
beforeEach(async () => {
  await prisma.userProfile.deleteMany();
  await prisma.rating.deleteMany();
  await prisma.watchlist.deleteMany();
  await prisma.watchHistory.deleteMany();
  await prisma.movieGenre.deleteMany();
  await prisma.movie.deleteMany();
  await prisma.genre.deleteMany();
  await prisma.user.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});
