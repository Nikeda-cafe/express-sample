import prisma from '../config/database';
import { User, Prisma } from '@prisma/client';

export class UserRepository {
  async findAll(): Promise<User[]> {
    return await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: number): Promise<User | null> {
    return await prisma.user.findUnique({
      where: { id },
      include: { posts: true },
    });
  }

  async findByEmail(email: string): Promise<User | null> {
    return await prisma.user.findUnique({
      where: { email },
    });
  }

  async create(data: Prisma.UserCreateInput): Promise<User> {
    return await prisma.user.create({
      data,
    });
  }

  async update(id: number, data: Prisma.UserUpdateInput): Promise<User> {
    return await prisma.user.update({
      where: { id },
      data,
    });
  }

  async delete(id: number): Promise<User> {
    return await prisma.user.delete({
      where: { id },
    });
  }

  async count(): Promise<number> {
    return await prisma.user.count();
  }
}

export default new UserRepository();
