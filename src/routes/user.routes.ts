import { Router } from 'express';
import { UserController } from '../controllers/user.controller';
import userService from '../services/user.service';

const router = Router();
const userController = new UserController(userService);

// ユーザー一覧
router.get('/', (req, res, next) => userController.index(req, res, next));

// ユーザー作成フォーム
router.get('/new', (req, res, next) => userController.new(req, res));

// ユーザー作成
router.post('/', (req, res, next) => userController.create(req, res, next));

// ユーザー詳細
router.get('/:id', (req, res, next) => userController.show(req, res, next));

// ユーザー編集フォーム
router.get('/:id/edit', (req, res, next) => userController.edit(req, res, next));

// ユーザー更新
router.post('/:id', (req, res, next) => userController.update(req, res, next));

// ユーザー削除
router.post('/:id/delete', (req, res, next) => userController.destroy(req, res, next));

export default router;
