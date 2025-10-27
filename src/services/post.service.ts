import postRepository, { PostRepository } from '../repositories/post.repository';
import userRepository from '../repositories/user.repository';
import { Post, Prisma } from '@prisma/client';

export class PostService {
  constructor(private postRepo: PostRepository = postRepository) {}

  async getAllPosts(publishedOnly: boolean = false): Promise<Post[]> {
    return await this.postRepo.findAll(publishedOnly ? true : undefined);
  }

  async getPostById(id: number): Promise<Post | null> {
    const post = await this.postRepo.findById(id);
    if (!post) {
      throw new Error('Post not found');
    }
    return post;
  }

  async getPostsByAuthor(authorId: number): Promise<Post[]> {
    // 著者の存在確認
    const author = await userRepository.findById(authorId);
    if (!author) {
      throw new Error('Author not found');
    }

    return await this.postRepo.findByAuthorId(authorId);
  }

  async createPost(data: {
    title: string;
    content?: string;
    authorId: number;
    published?: boolean;
  }): Promise<Post> {
    // 著者の存在確認
    const author = await userRepository.findById(data.authorId);
    if (!author) {
      throw new Error('Author not found');
    }

    // バリデーション
    if (!data.title || data.title.trim().length === 0) {
      throw new Error('Title is required');
    }

    if (data.title.length > 200) {
      throw new Error('Title is too long (max 200 characters)');
    }

    return await this.postRepo.create({
      title: data.title,
      content: data.content,
      published: data.published || false,
      author: {
        connect: { id: data.authorId },
      },
    });
  }

  async updatePost(id: number, data: {
    title?: string;
    content?: string;
    published?: boolean;
  }): Promise<Post> {
    // 投稿の存在確認
    const existingPost = await this.postRepo.findById(id);
    if (!existingPost) {
      throw new Error('Post not found');
    }

    // バリデーション
    if (data.title !== undefined) {
      if (!data.title || data.title.trim().length === 0) {
        throw new Error('Title is required');
      }
      if (data.title.length > 200) {
        throw new Error('Title is too long (max 200 characters)');
      }
    }

    return await this.postRepo.update(id, data);
  }

  async deletePost(id: number): Promise<Post> {
    // 投稿の存在確認
    const existingPost = await this.postRepo.findById(id);
    if (!existingPost) {
      throw new Error('Post not found');
    }

    return await this.postRepo.delete(id);
  }

  async publishPost(id: number): Promise<Post> {
    // 投稿の存在確認
    const existingPost = await this.postRepo.findById(id);
    if (!existingPost) {
      throw new Error('Post not found');
    }

    if (existingPost.published) {
      throw new Error('Post is already published');
    }

    return await this.postRepo.publish(id);
  }
}

export default new PostService();
