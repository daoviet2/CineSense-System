import { Prisma, PrismaClient } from '@prisma/client';
import { prisma as defaultPrisma } from '../../config/db.js';
import { GenreDto } from './movie.types.js';

type GenreWriter = Pick<Prisma.TransactionClient, '$executeRaw'>;

async function upsertGenres(writer: GenreWriter, genres: GenreDto[]): Promise<void> {
  const uniqueGenres = Array.from(new Map(genres.map((genre) => [genre.id, genre])).values());
  if (uniqueGenres.length === 0) return;

  const rows = uniqueGenres.map(({ id, name }) => Prisma.sql`(${id}, ${name})`);
  await writer.$executeRaw(Prisma.sql`
    INSERT INTO "genres" ("id", "name")
    VALUES ${Prisma.join(rows)}
    ON CONFLICT ("id") DO UPDATE SET "name" = EXCLUDED."name"
  `);
}

export interface IGenreRepository {
  findAll(): Promise<GenreDto[]>;
  upsertMany(genres: GenreDto[]): Promise<void>;
}

export class PrismaGenreRepository implements IGenreRepository {
  constructor(private readonly prisma: PrismaClient = defaultPrisma) {}

  async findAll(): Promise<GenreDto[]> {
    return this.prisma.genre.findMany({
      select: { id: true, name: true },
      orderBy: { id: 'asc' },
    });
  }

  async upsertMany(genres: GenreDto[]): Promise<void> {
    await upsertGenres(this.prisma, genres);
  }
}

export function createGenreRepository(prismaClient?: PrismaClient): IGenreRepository {
  return new PrismaGenreRepository(prismaClient);
}

export { upsertGenres };
