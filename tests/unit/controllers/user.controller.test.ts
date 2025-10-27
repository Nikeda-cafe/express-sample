import { Request, Response, NextFunction } from 'express';
import { UserController } from '../../../src/controllers/user.controller';
import { UserService } from '../../../src/services/user.service';

describe('UserController', () => {
  let userController: UserController;
  let mockUserService: jest.Mocked<UserService>;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockUserService = {
      getAllUsers: jest.fn(),
      getUserById: jest.fn(),
      createUser: jest.fn(),
      updateUser: jest.fn(),
      deleteUser: jest.fn(),
      getUserStats: jest.fn(),
    } as any;

    userController = new UserController(mockUserService);

    mockRequest = {
      params: {},
      body: {},
      query: {},
    };

    mockResponse = {
      render: jest.fn(),
      redirect: jest.fn(),
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    mockNext = jest.fn();
  });

  describe('index', () => {
    it('should render users index page with all users', async () => {
      const mockUsers = [
        { id: 1, email: 'user1@example.com', name: 'User 1', createdAt: new Date(), updatedAt: new Date() },
        { id: 2, email: 'user2@example.com', name: 'User 2', createdAt: new Date(), updatedAt: new Date() },
      ];

      mockUserService.getAllUsers.mockResolvedValue(mockUsers);

      await userController.index(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockUserService.getAllUsers).toHaveBeenCalled();
      expect(mockResponse.render).toHaveBeenCalledWith('users/index', {
        title: 'Users',
        users: mockUsers,
      });
    });

    it('should call next with error if service throws', async () => {
      const error = new Error('Database error');
      mockUserService.getAllUsers.mockRejectedValue(error);

      await userController.index(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('create', () => {
    it('should create user and redirect to users list', async () => {
      mockRequest.body = { email: 'new@example.com', name: 'New User' };
      const mockUser = { id: 1, ...mockRequest.body, createdAt: new Date(), updatedAt: new Date() };

      mockUserService.createUser.mockResolvedValue(mockUser);

      await userController.create(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockUserService.createUser).toHaveBeenCalledWith(mockRequest.body);
      expect(mockResponse.redirect).toHaveBeenCalledWith('/users');
    });
  });
});
