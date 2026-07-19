const http = require('http');
const https = require('https');

const target = 'cinepurr.me';

const server = http.createServer((req, res) => {
  const options = {
    hostname: target,
    port: 443,
    path: req.url,
    method: req.method,
    headers: {
      ...req.headers,
      host: target,
    },
  };

  const proxyReq = https.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res);
  });

  proxyReq.on('error', (e) => {
    console.error(`problem with request: ${e.message}`);
    res.statusCode = 500;
    res.end();
  });

  req.pipe(proxyReq);
});

server.listen(3000, () => {
  console.log('Proxy server listening on http://localhost:3000 -> https://cinepurr.me');
});
