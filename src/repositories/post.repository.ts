import prisma from '../config/database';
import { Post, Prisma } from '@prisma/client';

export class PostRepository {
  async findAll(published?: boolean): Promise<Post[]> {
    return await prisma.post.findMany({
      where: published !== undefined ? { published } : undefined,
      include: { author: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: number): Promise<Post | null> {
    return await prisma.post.findUnique({
      where: { id },
      include: { author: true },
    });
  }

  async findByAuthorId(authorId: number): Promise<Post[]> {
    return await prisma.post.findMany({
      where: { authorId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(data: Prisma.PostCreateInput): Promise<Post> {
    return await prisma.post.create({
      data,
      include: { author: true },
    });
  }

  async update(id: number, data: Prisma.PostUpdateInput): Promise<Post> {
    return await prisma.post.update({
      where: { id },
      data,
      include: { author: true },
    });
  }

  async delete(id: number): Promise<Post> {
    return await prisma.post.delete({
      where: { id },
    });
  }

  async publish(id: number): Promise<Post> {
    return await prisma.post.update({
      where: { id },
      data: { published: true },
    });
  }
}

export default new PostRepository();
