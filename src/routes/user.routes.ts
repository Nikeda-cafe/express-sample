import { Router } from 'express';
import { UserController } from '../controllers/user.controller';
import userService from '../services/user.service';

const router = Router();
const userController = new UserController(userService);

// ユーザー一覧
router.get('/', (req, res, _next) => userController.index(req, res, _next));

// ユーザー作成フォーム
router.get('/new', (req, res, _next) => userController.new(req, res));

// ユーザー作成
router.post('/', (req, res, _next) => userController.create(req, res, _next));

// ユーザー詳細
router.get('/:id', (req, res, _next) => userController.show(req, res, _next));

// ユーザー編集フォーム
router.get('/:id/edit', (req, res, _next) => userController.edit(req, res, _next));

// ユーザー更新
router.post('/:id', (req, res, _next) => userController.update(req, res, _next));

// ユーザー削除
router.post('/:id/delete', (req, res, _next) => userController.destroy(req, res, _next));

export default router;
