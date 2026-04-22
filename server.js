const http = require('http');
const httpProxy = require('http-proxy');
const url = require('url');

const port = process.env.PORT || 8080;
const proxy = httpProxy.createProxyServer({});

proxy.on('proxyReq', (proxyReq, req, res) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url} from ${req.socket.remoteAddress}`);
});

proxy.on('error', (err, req, res) => {
  console.error('Proxy error:', err);
  if (!res.headersSent) {
    res.writeHead(500, { 'Content-Type': 'text/plain' });
  }
  res.end('Proxy error');
});

const server = http.createServer((req, res) => {
  if (req.url === '/ping') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('pong');
    return;
  }

  const auth = req.headers['proxy-authorization'];
  const expectedAuth = 'Basic ' + Buffer.from('KingArtur').toString('base64');
  if (!auth || auth !== expectedAuth) {
    res.writeHead(407, {
      'Proxy-Authenticate': 'Basic realm="Proxy"'
    });
    res.end('Proxy authentication required');
    return;
  }

  const target = req.url;
  proxy.web(req, res, { target, changeOrigin: true });
});

server.on('connect', (req, clientSocket, head) => {
  const auth = req.headers['proxy-authorization'];
  const expectedAuth = 'Basic ' + Buffer.from('KingArtur').toString('base64');
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
    console.error('CONNECT target error:', err);
    clientSocket.end('HTTP/1.1 502 Bad Gateway\r\n\r\n');
  });
});

server.listen(port, () => {
  console.log(`Proxy server is running on port ${port}`);
});
