/**
 * バッチ実行のエントリーポイント
 * 環境変数 BATCH_JOB で実行するバッチを指定
 */
import dotenv from 'dotenv';
import { executeCreateSamplePost } from './create-sample-post';

// 環境変数の読み込み
dotenv.config();

async function main() {
  const jobName = process.env.BATCH_JOB || process.argv[2];

  if (!jobName) {
    console.error('Error: BATCH_JOB environment variable or job name argument is required');
    console.error('Available jobs: create-sample-post');
    process.exit(1);
  }

  console.log(`Executing batch job: ${jobName}`);

  try {
    switch (jobName) {
      case 'create-sample-post':
        await executeCreateSamplePost();
        break;
      default:
        console.error(`Error: Unknown batch job: ${jobName}`);
        console.error('Available jobs: create-sample-post');
        process.exit(1);
    }
  } catch (error) {
    console.error(`Batch job ${jobName} failed:`, error);
    process.exit(1);
  }
}

main();
