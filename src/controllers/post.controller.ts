import { Request, Response, NextFunction } from 'express';
import { PostService } from '../services/post.service';

export class PostController {
  constructor(private postService: PostService) { }

  // GET /posts - 投稿一覧表示
  async index(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const publishedOnly = req.query.published === 'true';
      const posts = await this.postService.getAllPosts(publishedOnly);

      res.render('posts/index', {
        title: 'Posts',
        posts,
        publishedOnly
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /posts/:id - 投稿詳細表示
  async show(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      const post = await this.postService.getPostById(id);

      res.render('posts/show', {
        title: post?.title,
        post
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /posts/new - 投稿作成フォーム表示
  async new(req: Request, res: Response): Promise<void> {
    res.render('posts/new', {
      title: 'Create Post',
      errors: []
    });
  }

  // POST /posts - 投稿作成
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { title, content, authorId, published } = req.body;
      const post = await this.postService.createPost({
        title,
        content,
        authorId: parseInt(authorId),
        published: published === 'true'
      });
      res.redirect(`/posts/${post.id}`);
    } catch (error) {
      next(error);
    }
  }

  // GET /posts/:id/edit - 投稿編集フォーム表示
  async edit(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      const post = await this.postService.getPostById(id);

      res.render('posts/edit', {
        title: 'Edit Post',
        post,
        errors: []
      });
    } catch (error) {
      next(error);
    }
  }

  // PUT /posts/:id - 投稿更新
  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      const { title, content, published } = req.body;
      await this.postService.updatePost(id, {
        title,
        content,
        published: published === 'true'
      });
      res.redirect(`/posts/${id}`);
    } catch (error) {
      next(error);
    }
  }

  // DELETE /posts/:id - 投稿削除
  async destroy(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      await this.postService.deletePost(id);
      res.redirect('/posts');
    } catch (error) {
      next(error);
    }
  }

  // POST /posts/:id/publish - 投稿を公開
  async publish(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      await this.postService.publishPost(id);
      res.redirect(`/posts/${id}`);
    } catch (error) {
      next(error);
    }
  }
}

// インスタンスの作成はルートファイルで行う
