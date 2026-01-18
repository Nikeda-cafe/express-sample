import dotenv from 'dotenv';
import prisma from '../config/database';
import { Post, User } from '@prisma/client';

// 環境変数の読み込み
dotenv.config();

/**
 * postsテーブルにサンプルデータを1件挿入するバッチ
 */
export async function executeCreateSamplePost(): Promise<void> {
  try {
    console.log('=== Batch started: create-sample-post ===');
    console.log(`Start time: ${new Date().toISOString()}`);

    // 既存のユーザーを取得（存在しない場合は作成）
    let user: User | null = await prisma.user.findFirst();
    
    if (!user) {
      console.log('No user found, creating a test user...');
      user = await prisma.user.create({
        data: {
          email: `batch-test-${Date.now()}@example.com`,
          name: 'Batch Test User',
        },
      });
      console.log(`Created user: ${user.id} - ${user.email}`);
    } else {
      console.log(`Using existing user: ${user.id} - ${user.email}`);
    }

    // postsテーブルにデータを挿入
    const post = await prisma.post.create({
      data: {
        title: `Sample Post from Batch - ${new Date().toISOString()}`,
        content: 'This is a sample post created by batch job.',
        published: false,
        authorId: user.id,
      },
      include: {
        author: true,
      },
    });

    // 結果をconsole.logで出力
    console.log('=== Post created successfully ===');
    console.log('Post details:');
    console.log(JSON.stringify({
      id: post.id,
      title: post.title,
      content: post.content,
      published: post.published,
      authorId: post.authorId,
      authorName: post.author.name,
      authorEmail: post.author.email,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
    }, null, 2));
    console.log(`End time: ${new Date().toISOString()}`);
    console.log('=== Batch completed successfully ===');
  } catch (error) {
    console.error('=== Batch failed ===');
    console.error('Error:', error);
    console.error(`Error time: ${new Date().toISOString()}`);
    throw error;
  } finally {
    // Prismaクライアントの接続を閉じる
    await prisma.$disconnect();
  }
}

// 直接実行された場合（ローカルテスト用）
if (require.main === module) {
  executeCreateSamplePost()
    .then(() => {
      console.log('Batch execution completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Batch execution failed:', error);
      process.exit(1);
    });
}
