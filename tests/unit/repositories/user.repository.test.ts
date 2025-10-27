import { UserRepository } from '../../../src/repositories/user.repository';
import prisma from '../../../src/config/database';

// Prismaのモック
jest.mock('../../../src/config/database', () => ({
  __esModule: true,
  default: {
    user: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
  },
}));

describe('UserRepository', () => {
  let userRepository: UserRepository;

  beforeEach(() => {
    userRepository = new UserRepository();
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return all users', async () => {
      const mockUsers = [
        { id: 1, email: 'user1@example.com', name: 'User 1', createdAt: new Date(), updatedAt: new Date() },
        { id: 2, email: 'user2@example.com', name: 'User 2', createdAt: new Date(), updatedAt: new Date() },
      ];

      (prisma.user.findMany as jest.Mock).mockResolvedValue(mockUsers);

      const result = await userRepository.findAll();

      expect(result).toEqual(mockUsers);
      expect(prisma.user.findMany).toHaveBeenCalledWith({
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('findById', () => {
    it('should return a user by id', async () => {
      const mockUser = {
        id: 1,
        email: 'user1@example.com',
        name: 'User 1',
        posts: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      const result = await userRepository.findById(1);

      expect(result).toEqual(mockUser);
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
        include: { posts: true },
      });
    });
  });
});
