import app from './app';
import { PrismaClient } from '@prisma/client';

const PORT = process.env.PORT || 3000;
const prisma = new PrismaClient();

// データベース接続テスト（オプショナル）
async function startServer() {
  // データベース接続を試みるが、失敗してもアプリは起動し続ける
  try {
    await prisma.$connect();
    console.log('Database connected successfully');
  } catch (error) {
    console.warn('Failed to connect to database. Continuing without database connection:', error);
    console.warn('Some features that require database may not work.');
  }

  // データベース接続の成否に関わらず、サーバーを起動
  app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
}

startServer();

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM signal received: closing HTTP server');
  try {
    await prisma.$disconnect();
  } catch (error) {
    // データベース接続がない場合でもエラーにしない
    console.warn('Error disconnecting from database:', error);
  }
  process.exit(0);
});
