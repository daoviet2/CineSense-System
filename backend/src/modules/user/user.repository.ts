import { PrismaClient } from '@prisma/client';
import { prisma as defaultPrisma } from '../../config/db.js';
import { CreateUserInput, UpdateUserInput, UserPublicDto, UserRecord } from './user.types.js';

export interface IUserRepository {
  findByEmail(email: string): Promise<UserRecord | null>;
  findById(id: string): Promise<UserPublicDto | null>;
  create(data: CreateUserInput): Promise<UserPublicDto>;
  updateById(id: string, data: UpdateUserInput): Promise<UserPublicDto | null>;
}

export class PrismaUserRepository implements IUserRepository {
  private readonly prisma: PrismaClient;

  constructor(prismaClient: PrismaClient = defaultPrisma) {
    this.prisma = prismaClient;
  }

  async findByEmail(email: string): Promise<UserRecord | null> {
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        name: true,
        email: true,
        passwordHash: true,
        avatarUrl: true,
        createdAt: true,
      },
    });

    return user;
  }

  async findById(id: string): Promise<UserPublicDto | null> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true,
        createdAt: true,
      },
    });

    return user;
  }

  async create(data: CreateUserInput): Promise<UserPublicDto> {
    const user = await this.prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        passwordHash: data.passwordHash,
        avatarUrl: data.avatarUrl ?? null,
      },
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true,
        createdAt: true,
      },
    });

    return user;
  }
  async updateById(id: string, data: UpdateUserInput): Promise<UserPublicDto | null> {
    // Strip undefined fields so Prisma only updates provided columns
    const updateData: Record<string, unknown> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.email !== undefined) updateData.email = data.email;
    // avatarUrl: undefined = not provided; null = clear; string = set
    if (data.avatarUrl !== undefined) updateData.avatarUrl = data.avatarUrl;

    try {
      const user = await this.prisma.user.update({
        where: { id },
        data: updateData,
        select: {
          id: true,
          name: true,
          email: true,
          avatarUrl: true,
          createdAt: true,
        },
      });
      return user;
    } catch (err: unknown) {
      const e = err as { code?: string };
      // P2025 = record not found
      if (e?.code === 'P2025') return null;
      throw err;
    }
  }
}

export function createUserRepository(prismaClient?: PrismaClient): IUserRepository {
  return new PrismaUserRepository(prismaClient);
}
