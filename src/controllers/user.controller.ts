import { Request, Response, NextFunction } from 'express';
import { UserService } from '../services/user.service';

export class UserController {
  constructor(private userService: UserService) {}

  // GET /users - ユーザー一覧表示
  async index(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const users = await this.userService.getAllUsers();
      res.render('users/index', {
        title: 'Users',
        users
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /users/:id - ユーザー詳細表示
  async show(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      const stats = await this.userService.getUserStats(id);

      res.render('users/show', {
        title: `User: ${stats.user.name || stats.user.email}`,
        user: stats.user,
        postCount: stats.postCount,
        publishedCount: stats.publishedCount
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /users/new - ユーザー作成フォーム表示
  async new(req: Request, res: Response): Promise<void> {
    res.render('users/new', {
      title: 'Create User',
      errors: []
    });
  }

  // POST /users - ユーザー作成
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, name } = req.body;
      await this.userService.createUser({ email, name });
      res.redirect('/users');
    } catch (error) {
      next(error);
    }
  }

  // GET /users/:id/edit - ユーザー編集フォーム表示
  async edit(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      const user = await this.userService.getUserById(id);

      res.render('users/edit', {
        title: 'Edit User',
        user,
        errors: []
      });
    } catch (error) {
      next(error);
    }
  }

  // PUT /users/:id - ユーザー更新
  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      const { email, name } = req.body;
      await this.userService.updateUser(id, { email, name });
      res.redirect(`/users/${id}`);
    } catch (error) {
      next(error);
    }
  }

  // DELETE /users/:id - ユーザー削除
  async destroy(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      await this.userService.deleteUser(id);
      res.redirect('/users');
    } catch (error) {
      next(error);
    }
  }
}

// インスタンスの作成はルートファイルで行う
