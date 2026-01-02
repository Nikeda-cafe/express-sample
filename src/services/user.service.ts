import userRepository, { UserRepository } from '../repositories/user.repository';
import postRepository from '../repositories/post.repository';
import { User, Prisma } from '@prisma/client';

export class UserService {
  constructor(private userRepo: UserRepository = userRepository) {}

  async getAllUsers(): Promise<User[]> {
    return await this.userRepo.findAll();
  }

  async getUserById(id: number): Promise<User | null> {
    const user = await this.userRepo.findById(id);
    if (!user) {
      throw new Error('User not found');
    }
    return user;
  }

  async createUser(data: { email: string; name?: string }): Promise<User> {
    // メールアドレスの重複チェック
    const existingUser = await this.userRepo.findByEmail(data.email);
    if (existingUser) {
      throw new Error('Email already exists');
    }

    // バリデーション
    if (!this.isValidEmail(data.email)) {
      throw new Error('Invalid email format');
    }

    return await this.userRepo.create(data);
  }

  async updateUser(id: number, data: { email?: string; name?: string }): Promise<User> {
    // ユーザーの存在確認
    const existingUser = await this.userRepo.findById(id);
    if (!existingUser) {
      throw new Error('User not found');
    }

    // メールアドレスが変更される場合、重複チェック
    if (data.email && data.email !== existingUser.email) {
      const emailExists = await this.userRepo.findByEmail(data.email);
      if (emailExists) {
        throw new Error('Email already exists');
      }

      if (!this.isValidEmail(data.email)) {
        throw new Error('Invalid email format');
      }
    }

    return await this.userRepo.update(id, data);
  }

  async deleteUser(id: number): Promise<User> {
    // ユーザーの存在確認
    const existingUser = await this.userRepo.findById(id);
    if (!existingUser) {
      throw new Error('User not found');
    }

    // 関連する投稿の削除（カスケード削除のロジック）
    const posts = await postRepository.findByAuthorId(id);
    for (const post of posts) {
      await postRepository.delete(post.id);
    }

    return await this.userRepo.delete(id);
  }

  async getUserStats(id: number): Promise<{ user: User; postCount: number; publishedCount: number }> {
    const user = await this.getUserById(id);
    if (!user) {
      throw new Error('User not found');
    }
    const posts = await postRepository.findByAuthorId(id);
    const publishedCount = posts.filter(post => post.published).length;

    return {
      user,
      postCount: posts.length,
      publishedCount,
    };
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}

export default new UserService();
