import express, { Application, Request, Response, NextFunction } from 'express';
import path from 'path';
import expressLayouts from 'express-ejs-layouts';
import routes from './routes';
import { errorHandler } from './middleware/error.middleware';

const app: Application = express();

// ビューエンジンの設定
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(expressLayouts);
app.set('layout', 'layouts/main');

// ミドルウェア
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../public')));

// CSS Modules のスタイルを提供
app.use('/styles', express.static(path.join(__dirname, 'styles')));

// ルート
app.use('/', routes);

// 404エラーハンドリング
app.use((req: Request, res: Response) => {
  res.status(404).render('error', {
    title: '404 Not Found',
    message: 'Page not found'
  });
});

// エラーハンドリングミドルウェア
app.use(errorHandler);

export default app;
