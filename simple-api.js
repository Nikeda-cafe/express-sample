const http = require('http');

const PORT = process.env.PORT || 3001;

const server = http.createServer((req, res) => {
  // CORSヘッダーを設定（必要に応じて）
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // OPTIONSリクエストの処理
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // シンプルなメッセージを返す
  const response = {
    message: 'Hello from Simple API!',
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.url
  };

  res.writeHead(200);
  res.end(JSON.stringify(response, null, 2));
});

server.listen(PORT, () => {
  console.log(`Simple API server is running on http://localhost:${PORT}`);
  console.log(`Access the API at http://localhost:${PORT}/`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});
