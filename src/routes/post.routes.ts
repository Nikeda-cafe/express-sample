import { Router } from 'express';
import { PostController } from '../controllers/post.controller';
import postService from '../services/post.service';

const router = Router();
const postController = new PostController(postService);

// 投稿一覧
router.get('/', (req, res, next) => postController.index(req, res, next));

// 投稿作成フォーム
router.get('/new', (req, res) => postController.new(req, res));

// 投稿作成
router.post('/', (req, res, next) => postController.create(req, res, next));

// 投稿詳細
router.get('/:id', (req, res, next) => postController.show(req, res, next));

// 投稿編集フォーム
router.get('/:id/edit', (req, res, next) => postController.edit(req, res, next));

// 投稿更新
router.post('/:id', (req, res, next) => postController.update(req, res, next));

// 投稿削除
router.post('/:id/delete', (req, res, next) => postController.destroy(req, res, next));

// 投稿公開
router.post('/:id/publish', (req, res, next) => postController.publish(req, res, next));

export default router;
