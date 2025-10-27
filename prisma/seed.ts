import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // ユーザーの作成
  const user1 = await prisma.user.create({
    data: {
      email: 'user1@example.com',
      name: 'User One',
    },
  });

  const user2 = await prisma.user.create({
    data: {
      email: 'user2@example.com',
      name: 'User Two',
    },
  });

  // 投稿の作成
  await prisma.post.create({
    data: {
      title: 'First Post',
      content: 'This is the first post',
      published: true,
      authorId: user1.id,
    },
  });

  await prisma.post.create({
    data: {
      title: 'Second Post',
      content: 'This is the second post',
      published: false,
      authorId: user2.id,
    },
  });

  console.log('Seed data created successfully');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
