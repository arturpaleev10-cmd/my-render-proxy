const http = require('http');
const httpProxy = require('http-proxy');
const url = require('url');

const port = process.env.PORT || 8080;
const proxy = httpProxy.createProxyServer({});

// Логирование каждого прокси-запроса
proxy.on('proxyReq', (proxyReq, req, res) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url} from ${req.socket.remoteAddress}`);
});

// Обработка ошибок прокси
proxy.on('error', (err, req, res) => {
  console.error('Proxy error:', err.message);
  if (!res.headersSent) {
    res.writeHead(500, { 'Content-Type': 'text/plain' });
  }
  res.end('Proxy error');
});

const server = http.createServer((req, res) => {
  // Эндпоинт для keep-alive
  if (req.url === '/ping') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('pong');
    return;
  }

  // Базовая аутентификация
  const auth = req.headers['proxy-authorization'];
  const expectedAuth = 'Basic ' + Buffer.from('user:password').toString('base64');
  if (!auth || auth !== expectedAuth) {
    res.writeHead(407, {
      'Proxy-Authenticate': 'Basic realm="Proxy"'
    });
    res.end('Proxy authentication required');
    return;
  }

  // Корректный разбор целевого URL, чтобы избежать ошибок Cloudflare
  const parsedUrl = url.parse(req.url);
  const target = parsedUrl.protocol + '//' + parsedUrl.host;
  req.url = parsedUrl.path || '/';   // подменяем url на путь без хоста
  proxy.web(req, res, { target, changeOrigin: true });
});

// Поддержка HTTPS CONNECT для туннелирования
server.on('connect', (req, clientSocket, head) => {
  // Авторизация для CONNECT
  const auth = req.headers['proxy-authorization'];
  const expectedAuth = 'Basic ' + Buffer.from('user:password').toString('base64');
  if (!auth || auth !== expectedAuth) {
    clientSocket.write('HTTP/1.1 407 Proxy Authentication Required\r\nProxy-Authenticate: Basic realm="Proxy"\r\n\r\n');
    clientSocket.end();
    return;
  }

  const { port: targetPort, hostname } = url.parse(`//${req.url}`, false, true);
  if (!hostname) {
    clientSocket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
    return;
  }

  const targetSocket = require('net').connect(targetPort || 443, hostname, () => {
    clientSocket.write('HTTP/1.1 200 Connection Established\r\n\r\n');
    targetSocket.write(head);
    targetSocket.pipe(clientSocket);
    clientSocket.pipe(targetSocket);
  });

  targetSocket.on('error', (err) => {
    console.error('CONNECT error:', err.message);
    clientSocket.end('HTTP/1.1 502 Bad Gateway\r\n\r\n');
  });
});

// Самопинг каждые 10 минут, чтобы сервис не засыпал
setInterval(() => {
  http.get(`http://localhost:${port}/ping`, (res) => {
    console.log('Self-ping OK');
    res.resume(); // считываем ответ, чтобы избежать утечек памяти
  }).on('error', (err) => {
    console.error('Self-ping failed:', err.message);
  });
}, 10 * 60 * 1000);

server.listen(port, () => {
  console.log(`Proxy server is running on port ${port}`);
});
