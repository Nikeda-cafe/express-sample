import { Router, Request, Response } from 'express';
import userRoutes from './user.routes';
import postRoutes from './post.routes';

const router = Router();

// トップページ
router.get('/', (req: Request, res: Response) => {
  res.render('index', { title: 'Home' });
});

// 各リソースのルーティング
router.use('/users', userRoutes);
router.use('/posts', postRoutes);

export default router;
