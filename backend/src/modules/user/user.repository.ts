import { PrismaClient } from '@prisma/client';
import { prisma as defaultPrisma } from '../../config/db.js';
import { CreateUserInput, UserPublicDto, UserRecord } from './user.types.js';

export interface IUserRepository {
  findByEmail(email: string): Promise<UserRecord | null>;
  findById(id: string): Promise<UserPublicDto | null>;
  create(data: CreateUserInput): Promise<UserPublicDto>;
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
}

export function createUserRepository(prismaClient?: PrismaClient): IUserRepository {
  return new PrismaUserRepository(prismaClient);
}
