import { UserService } from '../../../src/services/user.service';
import { UserRepository } from '../../../src/repositories/user.repository';

describe('UserService', () => {
  let userService: UserService;
  let mockUserRepository: jest.Mocked<UserRepository>;

  beforeEach(() => {
    mockUserRepository = {
      findAll: jest.fn(),
      findById: jest.fn(),
      findByEmail: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    } as any;

    userService = new UserService(mockUserRepository);
  });

  describe('createUser', () => {
    it('should create a new user successfully', async () => {
      const userData = { email: 'test@example.com', name: 'Test User' };
      const mockUser = { id: 1, ...userData, createdAt: new Date(), updatedAt: new Date() };

      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockUserRepository.create.mockResolvedValue(mockUser);

      const result = await userService.createUser(userData);

      expect(result).toEqual(mockUser);
      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(userData.email);
      expect(mockUserRepository.create).toHaveBeenCalledWith(userData);
    });

    it('should throw error if email already exists', async () => {
      const userData = { email: 'existing@example.com', name: 'Test User' };
      const existingUser = { id: 1, ...userData, createdAt: new Date(), updatedAt: new Date() };

      mockUserRepository.findByEmail.mockResolvedValue(existingUser);

      await expect(userService.createUser(userData)).rejects.toThrow('Email already exists');
      expect(mockUserRepository.create).not.toHaveBeenCalled();
    });

    it('should throw error if email format is invalid', async () => {
      const userData = { email: 'invalid-email', name: 'Test User' };

      mockUserRepository.findByEmail.mockResolvedValue(null);

      await expect(userService.createUser(userData)).rejects.toThrow('Invalid email format');
      expect(mockUserRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('getUserById', () => {
    it('should return user if found', async () => {
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        name: 'Test User',
        posts: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockUserRepository.findById.mockResolvedValue(mockUser);

      const result = await userService.getUserById(1);

      expect(result).toEqual(mockUser);
    });

    it('should throw error if user not found', async () => {
      mockUserRepository.findById.mockResolvedValue(null);

      await expect(userService.getUserById(999)).rejects.toThrow('User not found');
    });
  });
});
